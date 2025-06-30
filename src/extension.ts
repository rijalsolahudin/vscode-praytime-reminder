// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { fetchPrayTimes } from './api/praytimeApi';

import { AdzanViewProvider } from './adzanViewProvider';
import { getWebviewContent } from './webview/getWebviewContent';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "praytime-reminder" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('praytime-reminder.helloWorld', async () => {
		const prayTimes = await fetchPrayTimes('Jakarta', 'Indonesia');
		if (prayTimes) {
			vscode.window.showInformationMessage(`Subuh: ${prayTimes.Fajr}, Dzuhur: ${prayTimes.Dhuhr}`);
		} else {
			vscode.window.showErrorMessage('Gagal mengambil jadwal sholat.');
		}
	});

	// Inisialisasi data awal (dummy, nanti bisa diupdate dari API)
	let prayTimes = { Fajr: '04:30', Dhuhr: '12:00', Asr: '15:15', Maghrib: '18:00', Isha: '19:10' };
	let location = 'Jakarta, Indonesia';

	const adzanProvider = new AdzanViewProvider(prayTimes, location);
	vscode.window.registerTreeDataProvider('praytimeSidebar', adzanProvider);

	const openSettings = vscode.commands.registerCommand('praytime-reminder.openSettings', () => {
		const panel = vscode.window.createWebviewPanel(
			'praytimeSettings',
			'PrayTime Reminder',
			vscode.ViewColumn.One,
			{ enableScripts: true }
		);

		panel.webview.html = getWebviewContent();
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(openSettings);
}

// This method is called when your extension is deactivated
export function deactivate() {}
