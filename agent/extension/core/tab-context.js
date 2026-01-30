// C:\KELEDON\agent\src\core\tab-context.js
export const TabContext = {
  activeTab: null,
  setTab(tabInfo) {
    this.activeTab = tabInfo;
  },
  getTab() {
    return this.activeTab;
  }
};