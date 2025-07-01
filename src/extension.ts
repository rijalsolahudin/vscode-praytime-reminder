// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

import { getWebviewContent } from './webview/getWebviewContent';
import { startStatusBar, disposeStatusBar } from './statusBar';

export let lastWebviewPanel: vscode.WebviewPanel | undefined;

export async function triggerAdzanReminder() {
	// If panel exists, reveal it; otherwise, create a new one
	if (lastWebviewPanel) {
		lastWebviewPanel.reveal(vscode.ViewColumn.One);
		// If already ready, send playAdzan immediately
		if ((lastWebviewPanel as any)._adzanReady) {
			lastWebviewPanel.webview.postMessage({ playAdzan: true });
		}
	} else {
		await vscode.commands.executeCommand('praytime-reminder.openSettings');
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Extension "praytime-reminder" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
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
		lastWebviewPanel = panel;
		(lastWebviewPanel as any)._adzanReady = false;
		panel.onDidDispose(() => {
			if (lastWebviewPanel === panel) lastWebviewPanel = undefined;
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
			if (lastWebviewPanel) {
				lastWebviewPanel.webview.postMessage({
					showAdzanPopup: true,
					prayerName: 'Subuh', // Dummy/test data
					time: '04:30',
					location: 'Jakarta, Indonesia'
				});
			}
		}, 700);
	});

	// Inisialisasi data awal (dummy, nanti bisa diupdate dari API)
	// let prayTimes = { Fajr: '04:30', Dhuhr: '12:00', Asr: '15:15', Maghrib: '18:00', Isha: '19:10' };
	// let location = 'Jakarta, Indonesia';
	//
	// const adzanProvider = new AdzanViewProvider(prayTimes, location);
	// vscode.window.registerTreeDataProvider('praytimeSidebar', adzanProvider);

	context.subscriptions.push(openSettings);
	context.subscriptions.push(testAdzan);

	// Status bar manager
	startStatusBar();
}

// This method is called when your extension is deactivated
export function deactivate() {
	disposeStatusBar();
}
