export interface IntroSlide {
  title: string;
  description: string;
}

/**
 * 首页顶部轮换展示的标题与副标题。
 * 第一条同时作为页面默认内容（无 JS 时也会显示），其余靠脚本轮换。
 * 增删条目直接改数组即可，顺序即展示顺序。
 */
export const introSlides: IntroSlide[] = [
  {
    title: '记录正在发生的事',
    description: '技术、建站，以及值得留下来的想法',
  },
  {
    title: '把复杂的事讲简单',
    description: '从 CPU 缓存到 MESI 协议，一层层拆开看',
  },
  {
    title: '写作是思考的副产品',
    description: '想不清楚的地方，写下来就清楚了',
  },
  {
    title: '生命因何而沉睡？',
    description: '因为…总有一天…我们会从梦中醒来',
  },
];

/** 轮换间隔，毫秒。 */
export const introInterval = 6000;
