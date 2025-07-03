import * as vscode from 'vscode';
import * as path from 'path';
import { getWebviewContent } from './webview/getWebviewContent';
import { setLastWebviewPanel, getLastWebviewPanel } from './panelManager';

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
			if (getLastWebviewPanel() === panel) {
				setLastWebviewPanel(undefined);
			}
		});
		panel.webview.onDidReceiveMessage(msg => {
			if (msg.ready) {
				(panel as any)._adzanReady = true;
				panel.webview.postMessage({ playAdzan: true });
			}
		});
	});

	const testAdzan = vscode.commands.registerCommand('praytime-reminder.testAdzan', async () => {
		await triggerAdzanReminder();
		setTimeout(() => {
			const panel = getLastWebviewPanel();
			if (panel) {
				panel.webview.postMessage({
					showAdzanPopup: true,
					prayerName: 'Subuh', // Dummy/test data
					time: '04:30',
					location: 'Jakarta, Indonesia'
				});
			}
		}, 700);
	});

	context.subscriptions.push(openSettings);
	context.subscriptions.push(testAdzan);
} 