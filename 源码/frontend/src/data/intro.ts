export interface IntroFeature {
  title: string
  text: string
}

export interface IntroStep {
  title: string
  text: string
}

export interface IntroContent {
  title: string
  tagline: string
  intro: string
  features: IntroFeature[]
  steps: IntroStep[]
  tips: string[]
}

export const INTRO_CONTENT: IntroContent = {
  title: '杂物定位 · 使用说明',
  tagline: '大包套小包，一搜就知道',
  intro:
    '杂物定位是一款帮你记住「东西放在哪」的个人收纳小工具。' +
    '家里东西多、总翻箱倒柜找不到？把位置和物品记进来，下次一搜就能找到，不用再满屋找。',
  features: [
    {
      title: '分层记位置，大包套小包也能记',
      text: '支持任意层级，比如「储物间 → 纸箱A → 小袋子」，一层层记清楚，取物时照着路径找就行。'
    },
    {
      title: '全局搜索，一搜就找到',
      text: '输入物品名、别名、标签或位置名，结果立即列出，并显示完整存放路径。'
    },
    {
      title: '标签分类，整理更省心',
      text: '给物品打标签（如「证件」「充电器」「药品」），同类物品跨位置也能集中查看。'
    },
    {
      title: '借出登记，不忘还',
      text: '东西借给别人时，记下借出人和日期，首页「借出中」一眼就能看到。'
    },
    {
      title: '照片留证，看脸认出',
      text: '重要物品拍张照存进来，找的时候看到照片更容易确认。'
    },
    {
      title: '数据备份，心里有底',
      text: '数据都存在你自己的浏览器里，可随时导出 JSON/CSV 备份，也能从 Excel/CSV 清单批量导入；选配 OneDrive 云备份后，换设备也能恢复。'
    }
  ],
  steps: [
    {
      title: '新增',
      text: '点右下角的「+」按钮，填物品名，并选择它放在哪（比如「储物间 → 纸箱A」）。'
    },
    {
      title: '搜索',
      text: '在顶部搜索框输入物品名或别名，试试「一搜就找到」。'
    },
    {
      title: '备份',
      text: '在「设置」里导出一次备份，数据就有保障了，建议以后定期导出。'
    }
  ],
  tips: [
    '数据保存在本机浏览器，不会上传到任何服务器（除非你主动开启 OneDrive 云备份）。',
    '清理浏览器数据会导致本地数据丢失，请记得先导出备份。',
    '支持添加到手机桌面、离线使用，断网也能查。'
  ]
}
