// 本文件为演示用 Mock 数据，不含真实个人数据（仅供公开仓库与功能演示）
// 结构参考真实收纳习惯：任意层级、大包套小包、药品类作为位置而非标签
// 真实数据请通过「设置 → 导入 JSON 备份」导入，备份文件由 tools/build-backup.mjs 生成
// 注意：请勿运行 tools/parse-data.mjs 覆盖本文件（它会写入 文档/数据.txt 中的真实数据）
import type { LocationType, SpaceIcon } from '@/types'

export interface SeedNode {
  name: string
  type: LocationType
  icon?: SpaceIcon
  quantity?: number
  unit?: string
  remark?: string
  tags?: string[]
  children: SeedNode[]
}

export const userRootNodes: SeedNode[] = [
  {
    name: '客厅',
    type: 'ROOM',
    icon: 'HOME',
    children: [
      {
        name: '蓝色书架',
        type: 'SHELF',
        children: [
          {
            name: '右侧',
            type: 'SHELF',
            children: [
              {
                name: '下层',
                type: 'SHELF',
                children: [
                  {
                    name: '蓝色收纳盒',
                    type: 'BOX',
                    children: [
                      { name: '数据线', type: 'OTHER', quantity: 2, unit: '根', tags: ['常用'], children: [] },
                      { name: '手机充电器', type: 'OTHER', tags: ['常用'], children: [] },
                      { name: '备用耳机', type: 'OTHER', tags: ['备用'], children: [] }
                    ]
                  }
                ]
              },
              {
                name: '中层',
                type: 'SHELF',
                children: [
                  {
                    name: '白色帆布包',
                    type: 'BAG',
                    children: [
                      { name: '折叠雨伞', type: 'OTHER', children: [] },
                      { name: '针线盒', type: 'OTHER', children: [] }
                    ]
                  },
                  {
                    name: '纸箱A',
                    type: 'BOX',
                    children: [
                      { name: '无线键盘', type: 'OTHER', children: [] },
                      { name: '无线鼠标', type: 'OTHER', children: [] },
                      { name: '移动硬盘', type: 'OTHER', tags: ['重要'], children: [] }
                    ]
                  }
                ]
              },
              {
                name: '上层',
                type: 'SHELF',
                children: [
                  {
                    name: '零食盒',
                    type: 'BOX',
                    children: [
                      { name: '一次性手套', type: 'OTHER', quantity: 3, unit: '个', children: [] },
                      { name: '湿巾', type: 'OTHER', children: [] },
                      { name: '吸管', type: 'OTHER', quantity: 10, unit: '根', children: [] }
                    ]
                  },
                  {
                    name: '工具盒',
                    type: 'BOX',
                    children: [
                      { name: '螺丝刀套装', type: 'OTHER', tags: ['工具'], children: [] },
                      { name: '卷尺', type: 'OTHER', tags: ['工具'], children: [] },
                      { name: '电池', type: 'OTHER', quantity: 4, unit: '节', tags: ['备用'], children: [] },
                      { name: '胶带', type: 'OTHER', children: [] }
                    ]
                  }
                ]
              }
            ]
          },
          {
            name: '左侧',
            type: 'SHELF',
            children: [
              { name: '台灯', type: 'OTHER', children: [] },
              { name: '保温杯', type: 'OTHER', tags: ['常用'], children: [] },
              {
                name: '文件盒',
                type: 'BOX',
                children: [
                  { name: '家电说明书', type: 'OTHER', children: [] },
                  { name: '保修卡', type: 'OTHER', tags: ['重要'], children: [] },
                  { name: '票据收纳袋', type: 'BAG', children: [] }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    name: '卧室',
    type: 'ROOM',
    icon: 'BEDROOM',
    children: [
      {
        name: '衣柜',
        type: 'CABINET',
        children: [
          { name: '换季被褥', type: 'OTHER', children: [] },
          { name: '旅行箱', type: 'OTHER', children: [] },
          {
            name: '收纳袋',
            type: 'BAG',
            children: [
              { name: '围巾', type: 'OTHER', children: [] },
              { name: '手套', type: 'OTHER', children: [] }
            ]
          }
        ]
      },
      {
        name: '床头柜',
        type: 'CABINET',
        children: [
          {
            name: '抽屉',
            type: 'DRAWER',
            children: [
              { name: '眼镜盒', type: 'OTHER', children: [] },
              { name: '指甲剪套装', type: 'OTHER', tags: ['工具'], children: [] },
              { name: '润唇膏', type: 'OTHER', children: [] }
            ]
          }
        ]
      }
    ]
  },
  {
    name: '储物间',
    type: 'ROOM',
    icon: 'STORAGE',
    children: [
      {
        name: '货架',
        type: 'SHELF',
        children: [
          { name: '工具箱', type: 'BOX', tags: ['工具'], children: [] },
          { name: '折叠梯', type: 'OTHER', children: [] },
          { name: '吸尘器', type: 'OTHER', children: [] },
          {
            name: '纸箱B',
            type: 'BOX',
            children: [
              { name: '过季衣物', type: 'OTHER', children: [] },
              { name: '旧书', type: 'OTHER', quantity: 5, unit: '本', children: [] }
            ]
          }
        ]
      }
    ]
  },
  {
    name: '电脑桌',
    type: 'OTHER',
    children: [
      {
        name: '右侧抽屉',
        type: 'DRAWER',
        children: [
          {
            name: '药品类',
            type: 'OTHER',
            children: [
              { name: '感冒灵颗粒', type: 'OTHER', remark: '2026年12月过期', children: [] },
              { name: '创可贴', type: 'OTHER', children: [] },
              { name: '维生素C', type: 'OTHER', remark: '2027年3月过期', children: [] },
              { name: '体温计', type: 'OTHER', children: [] },
              { name: '酒精棉片', type: 'OTHER', quantity: 2, unit: '盒', remark: '2027年6月过期', children: [] }
            ]
          },
          { name: '签字笔', type: 'OTHER', quantity: 2, unit: '支', children: [] },
          { name: '便利贴', type: 'OTHER', children: [] },
          { name: '订书机', type: 'OTHER', children: [] }
        ]
      },
      {
        name: '左侧抽屉',
        type: 'DRAWER',
        children: [
          { name: '笔记本', type: 'OTHER', children: [] },
          { name: '充电宝', type: 'OTHER', tags: ['常用'], children: [] },
          { name: '备用数据线', type: 'OTHER', tags: ['备用'], children: [] }
        ]
      }
    ]
  }
]
