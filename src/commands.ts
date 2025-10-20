import * as vscode from 'vscode';
import * as path from 'path';
import { getWebviewContent } from './webview/getWebviewContent';
import { setLastWebviewPanel, getLastWebviewPanel } from './panelManager';
import { stopAdzanAudio, triggerAdzanNotification, triggerSoonNotification } from './statusBar';

export async function triggerAdzanReminder() {
	const panel = getLastWebviewPanel();
	if (panel) {
		panel.reveal(vscode.ViewColumn.One);
		if ((panel as any)._adzanReady) {
			panel.webview.postMessage({ playAdzan: true });
		}
	} else {
		await vscode.commands.executeCommand('praytime-reminder.openSettings');
	}
}

export function registerCommands(context: vscode.ExtensionContext) {
	const openSettings = vscode.commands.registerCommand('praytime-reminder.openSettings', async () => {
		const panel = vscode.window.createWebviewPanel(
			'praytimeSettings',
			'PrayTime Reminder',
			vscode.ViewColumn.One,
			{ enableScripts: true }
		);

		// Resolve webview URIs
		const adzanAudioPath = vscode.Uri.file(path.join(__dirname, 'assets/adzan-mekkah.mp3'));
		const adzanAudioUrl = panel.webview.asWebviewUri(adzanAudioPath).toString();
		
		const cssPath = vscode.Uri.file(path.join(__dirname, 'webview/webview.css'));
		const cssUrl = panel.webview.asWebviewUri(cssPath).toString();
		
		const jsPath = vscode.Uri.file(path.join(__dirname, 'webview/webview.js'));
		const jsUrl = panel.webview.asWebviewUri(jsPath).toString();
		
		const cspSource = panel.webview.cspSource;

		panel.webview.html = await getWebviewContent(adzanAudioUrl, cssUrl, jsUrl, cspSource);
		setLastWebviewPanel(panel);
		(panel as any)._adzanReady = false;
		panel.onDidDispose(() => {
			// Stop audio when webview panel is closed
			stopAdzanAudio();
			
			if (getLastWebviewPanel() === panel) {
				setLastWebviewPanel(undefined);
			}
		});
		panel.webview.onDidReceiveMessage(async (msg) => {
			console.log('[commands] Received message from webview:', msg);
			
			if (msg.ready) {
				(panel as any)._adzanReady = true;
				panel.webview.postMessage({ playAdzan: true });
			}
			if (msg.stopAdzan) {
				// Stop adzan audio when user closes popup
				console.log('[commands] stopAdzan message received, calling stopAdzanAudio()');
				stopAdzanAudio();
			}
			if (msg.getSettings) {
				// Send current settings to webview
				const config = vscode.workspace.getConfiguration('praytime-reminder');
				const settings = {
					enableAdzanSound: config.get('enableAdzanSound', true),
					enableSoonNotification: config.get('enableSoonNotification', true),
					soonNotificationMinutes: config.get('soonNotificationMinutes', 5)
				};
				panel.webview.postMessage({ currentSettings: settings });
			}
			if (msg.updateSetting) {
				// Update setting in VSCode config
				const config = vscode.workspace.getConfiguration('praytime-reminder');
				config.update(msg.key, msg.value, vscode.ConfigurationTarget.Global);
				console.log('[commands] Setting updated:', msg.key, '=', msg.value);
			}
			if (msg.saveSettings) {
				// Save all settings at once
				const config = vscode.workspace.getConfiguration('praytime-reminder');
				const settings = msg.settings;
				
				await config.update('enableAdzanSound', settings.enableAdzanSound, vscode.ConfigurationTarget.Global);
				await config.update('enableSoonNotification', settings.enableSoonNotification, vscode.ConfigurationTarget.Global);
				await config.update('soonNotificationMinutes', settings.soonNotificationMinutes, vscode.ConfigurationTarget.Global);
				
				console.log('[commands] All settings saved:', settings);
				vscode.window.showInformationMessage('✅ Pengaturan berhasil disimpan');
			}
		});
	});

	const stopAdzan = vscode.commands.registerCommand('praytime-reminder.stopAdzan', () => {
		stopAdzanAudio();
		vscode.window.showInformationMessage('Adzan audio dihentikan.');
	});

	const testAdzan = vscode.commands.registerCommand('praytime-reminder.testAdzan', async () => {
		// Only allow in development mode
		if (context.extensionMode === vscode.ExtensionMode.Production) {
			vscode.window.showWarningMessage('⚠️ Test commands are only available in Extension Development Mode.');
			console.log('[testAdzan] Blocked: Extension is running in production mode');
			return;
		}
		
		// Use the SAME function as real adzan (consistency!)
		console.log('[testAdzan] Triggering test adzan notification');
		
		await triggerAdzanNotification(
			'Subuh',                    // Test prayer name
			'04:30',                    // Test time
			'Jakarta, Indonesia',       // Test location
			'WIB'                       // Test timezone
		);
		
		console.log('[testAdzan] Test adzan triggered successfully');
	});

	const testSoonNotification = vscode.commands.registerCommand('praytime-reminder.testSoonNotification', async () => {
		// Only allow in development mode
		if (context.extensionMode === vscode.ExtensionMode.Production) {
			vscode.window.showWarningMessage('⚠️ Test commands are only available in Extension Development Mode.');
			console.log('[testSoonNotification] Blocked: Extension is running in production mode');
			return;
		}
		
		// Use the SAME function as real soon notification (consistency!)
		console.log('[testSoonNotification] Triggering test soon notification');

		// Read settings so tests follow real configuration
		const config = vscode.workspace.getConfiguration('praytime-reminder');
		const enableSoonNotification = config.get('enableSoonNotification', true);
		const soonNotificationMinutes = config.get('soonNotificationMinutes', 5);

		if (!enableSoonNotification) {
			vscode.window.showInformationMessage('Notifikasi sebelum adzan sedang dimatikan di pengaturan. Aktifkan untuk menjalankan test.');
			console.log('[testSoonNotification] Aborted: enableSoonNotification is false');
			return;
		}

		await triggerSoonNotification(
			'Dzuhur',                   // Test prayer name
			soonNotificationMinutes,    // Respect configured minutes
			'Jakarta, Indonesia'        // Test location
		);
		
		console.log('[testSoonNotification] Test soon notification triggered successfully');
	});

	context.subscriptions.push(openSettings);
	context.subscriptions.push(testAdzan);
	context.subscriptions.push(testSoonNotification);
	context.subscriptions.push(stopAdzan);
} 