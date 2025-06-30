import * as vscode from 'vscode';

export class AdzanViewProvider implements vscode.TreeDataProvider<AdzanItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<AdzanItem | undefined | void> = new vscode.EventEmitter<AdzanItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<AdzanItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor(private prayTimes: Record<string, string>, private location: string) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: AdzanItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<AdzanItem[]> {
    const iconMap: Record<string, string> = {
      Fajr: '🌅',
      Dhuhr: '☀️',
      Asr: '🌤️',
      Maghrib: '🌇',
      Isha: '🌙',
    };
    const items: AdzanItem[] = [
      new AdzanItem(`📍 Lokasi: ${this.location}`, vscode.TreeItemCollapsibleState.None, 'location'),
      ...Object.entries(this.prayTimes).map(([name, time]) =>
        new AdzanItem(`${iconMap[name] || ''} ${name}: ${time}`, vscode.TreeItemCollapsibleState.None, name)
      )
    ];
    return Promise.resolve(items);
  }
}

class AdzanItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue?: string
  ) {
    super(label, collapsibleState);
  }
} 