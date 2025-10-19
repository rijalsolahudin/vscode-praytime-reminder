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

		// Resolve adzan audio file as webview URI
		const adzanAudioPath = vscode.Uri.file(path.join(__dirname, 'assets/adzan-mekkah.mp3'));
		const adzanAudioUrl = panel.webview.asWebviewUri(adzanAudioPath).toString();

		panel.webview.html = await getWebviewContent(adzanAudioUrl);
		setLastWebviewPanel(panel);
		(panel as any)._adzanReady = false;
		panel.onDidDispose(() => {
			// Stop audio when webview panel is closed
			stopAdzanAudio();
			
			if (getLastWebviewPanel() === panel) {
				setLastWebviewPanel(undefined);
			}
		});
		panel.webview.onDidReceiveMessage(msg => {
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
		});
	});

	const stopAdzan = vscode.commands.registerCommand('praytime-reminder.stopAdzan', () => {
		stopAdzanAudio();
		vscode.window.showInformationMessage('Adzan audio dihentikan.');
	});

	const testAdzan = vscode.commands.registerCommand('praytime-reminder.testAdzan', async () => {
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
		// Use the SAME function as real soon notification (consistency!)
		console.log('[testSoonNotification] Triggering test soon notification');
		
		await triggerSoonNotification(
			'Dzuhur',                   // Test prayer name
			5,                          // Test minutes left
			'Jakarta, Indonesia'        // Test location
		);
		
		console.log('[testSoonNotification] Test soon notification triggered successfully');
	});

	context.subscriptions.push(openSettings);
	context.subscriptions.push(testAdzan);
	context.subscriptions.push(testSoonNotification);
	context.subscriptions.push(stopAdzan);
} 