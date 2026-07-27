export interface BackupData {
  version: string;
  timestamp: string;
  data: any;
}

export const backupService = {
  exportData: async () => {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {}
    };
  },
  
  downloadBackup: (backup: any) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  },
  
  // ignore tableName for mock
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  exportToCSV: async (_tableName: string) => {
    return 'id,name\n1,test';
  },
  
  downloadCSV: (csv: string, filename: string) => {
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  },
  
  importData: async (backup: BackupData) => {
    console.log('Importing data...', backup);
    return true;
  }
};