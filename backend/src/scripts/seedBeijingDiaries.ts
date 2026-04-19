import { initializeDatabase, AppDataSource, In } from '../config/database';
import { Diary } from '../entities/Diary';
import { DiaryComment } from '../entities/DiaryComment';
import { User } from '../entities/User';
import { DiaryService } from '../services/DiaryService';

type SeedDiary = {
  username: string;
  title: string;
  destination: string;
  route: string[];
  popularity: number;
  content: string;
  comments: Array<{
    username: string;
    rating: number;
    content: string;
  }>;
};

const beijingDiarySeeds: SeedDiary[] = [
  {
    username: 'user1',
    title: '晨光里的故宫与景山：一个人走进北京的层层红墙',
    destination: '故宫博物院',
    route: ['午门', '太和殿', '中和殿', '保和殿', '珍宝馆', '神武门', '景山公园'],
    popularity: 5832,
    content:
      '一个人来北京，总想把第一天留给故宫。早上从午门进场的时候，阳光刚好落在红墙和金瓦上，原本在照片里看过很多次的宫殿群，真正站到面前还是会被那种秩序感击中。太和殿前的人不少，但只要不着急往前挤，顺着中轴线慢慢走，反而更能体会这座皇城的呼吸。午后的风吹过广场，檐角的兽像安安静静地立着，我突然觉得北京最动人的地方，不是某一个爆火机位，而是历史和日常在同一条线上并存的感觉。走出神武门后我没有立刻离开，而是去了景山公园。爬到万春亭回头看故宫全景，密密的屋顶像被时光铺开了一层金色纹理。那一瞬间很难形容，像是终于把书本里平面的“紫禁城”看成立体的北京。傍晚再从景山下来，路边买一杯热饮，整个人已经从赶行程的游客变成愿意在这座城市里慢慢停留的人。给第一次来北京的人一个很真诚的建议：故宫一定要早到，鞋子一定要舒服，留一点体力给景山，因为站在高处回望，会让这一天完整很多。',
    comments: [
      { username: 'user2', rating: 5, content: '景山回望故宫这段写得特别有画面感，看完就想按你的路线走一遍。' },
      { username: 'user3', rating: 4, content: '时间节奏安排得很舒服，尤其适合第一次去北京的人参考。' },
    ],
  },
  {
    username: 'user1',
    title: '颐和园慢逛时间线攻略：长廊、昆明湖和傍晚西堤',
    destination: '颐和园',
    route: ['东宫门', '仁寿殿', '长廊', '排云殿', '佛香阁', '石舫', '西堤'],
    popularity: 5410,
    content:
      '如果说故宫是北京的厚重，那颐和园更像北京舒展开来的一面。这篇更偏攻略，适合想把节奏放慢的人。建议上午九点前从东宫门进，先看仁寿殿和前山建筑，再顺着长廊慢慢走。长廊真的不要赶，梁枋彩画、湖风、远处的船影，都是必须留意的小细节。中午可以在排云殿附近稍作休息，体力够的话再上佛香阁，看昆明湖展开在脚下。下午往石舫方向走，人会比核心区域稍微松一些，这时候拍湖岸和垂柳很出片。真正让我记住这次颐和园的，是傍晚的西堤。夕阳压低以后，湖面颜色会一点点变暖，游客的声音也会慢慢淡下来，整片园子从热闹转入安静，好像终于露出本来的样子。我坐在湖边很久，没有赶下一站，也没有急着拍照，只是看风吹水面。北京有很多强烈的景点，但颐和园让我喜欢的是它的留白。建议带一瓶水、备点简单零食，路线不要排得太满，给自己留一段“只是走路”的时间，体验会比打卡轻松很多。',
    comments: [
      { username: 'user4', rating: 5, content: '这条路线非常实用，尤其是西堤傍晚那段建议，真的很加分。' },
      { username: 'user2', rating: 5, content: '节奏安排得很好，适合不想暴走但又想看全精华的人。' },
    ],
  },
  {
    username: 'user2',
    title: '天坛的风从祈年殿吹来：北京一日散记',
    destination: '天坛公园',
    route: ['东门', '长廊', '祈年殿', '回音壁', '圜丘', '斋宫'],
    popularity: 4978,
    content:
      '我一直觉得天坛和故宫不是一种看法。故宫适合仰望，天坛更适合安静地感受。那天从东门进园，先遇到的是一群正在晨练的老人，树荫下有人唱戏，有人打太极，北京的生活感一下子就出来了。走到祈年殿前，蓝瓦圆顶在天空下面格外干净，和我印象里厚重的皇家建筑完全不同。它像一个更轻、更空灵的象征，提醒人敬天、敬时序，也敬自己有限的情绪。回音壁附近人流会更集中，但只要稍微错开一点，还是能找到比较安静的角落。圜丘的石阶很适合慢慢走，站在中央时会有种周围声音突然收拢的感觉。离开主轴以后，我反而更喜欢林荫道和草地，那些没有被“必须打卡”定义的地方，让天坛从景点变成了一个可以呼吸的空间。北京的春风穿过松柏时有一种很淡的凉意，站在树下会觉得心绪被理顺了。适合想放松、想从城市噪音里抽离的人来这里走一圈，不用安排太多任务，甚至不必刻意追求效率。',
    comments: [
      { username: 'user1', rating: 4, content: '把天坛写得很有气质，读完会觉得这不是匆匆打卡的地方。' },
      { username: 'user3', rating: 5, content: '晨练和园林氛围这部分很真实，特别像真正走在园子里的视角。' },
    ],
  },
  {
    username: 'user2',
    title: '什刹海夜游实用攻略：烟袋斜街、后海、鼓楼怎么安排',
    destination: '什刹海',
    route: ['烟袋斜街', '银锭桥', '后海', '钟鼓楼外街区'],
    popularity: 4650,
    content:
      '这篇给想体验北京夜晚氛围的人。我的建议是下午四点左右先到烟袋斜街，白天光线还在，适合边走边看小店，不会像晚上那样拥挤。接着慢慢往银锭桥方向走，桥上视野很好，能看到湖面、杨柳和远处屋顶叠在一起，是很典型的北京胡同水岸画面。真正的夜色从后海开始。天暗下来以后，湖边灯光、驻唱和散步的人会把气氛一下子推起来，但也容易让人觉得乱，所以路线最好不要贪多。我自己的做法是只选一段湖岸认真走，走累了就找一家临水的小店坐一会儿，看人群和倒影。再往鼓楼方向去，街区会更安静一点，也更适合收尾。什刹海不是那种必须狂拍景点照的地方，它更像一段生活化的夜游体验，适合朋友结伴，也适合一个人慢慢晃。攻略上的建议很简单：穿舒服的鞋，少背东西，晚饭不要拖太晚，七点到八点是氛围最好的时段。如果你喜欢北京的市井感和水边夜色，这里值得留半天到一整晚。',
    comments: [
      { username: 'user4', rating: 4, content: '路线很清楚，尤其适合第一次去什刹海怕乱的人。' },
      { username: 'user1', rating: 5, content: '夜游节奏拿捏得很好，读起来就像在旁边一起散步。' },
    ],
  },
  {
    username: 'user3',
    title: '八达岭长城清晨出发：把北京的风景走进脚底',
    destination: '八达岭长城',
    route: ['北一楼', '北四楼', '北八楼', '返程观景点'],
    popularity: 4322,
    content:
      '很多人会说长城人多、累、商业化重，但如果出发时间对了，感受真的不一样。我那次是清晨很早就动身，到八达岭时山里空气还带着一点凉，游客虽然已经有了，但远没有高峰期那么拥挤。一路往上走，最直接的感受不是“震撼”，而是脚下每一步都在提醒你这段路的真实难度。长城不是站在平台上远看就够了，只有真正踩上去，才会明白那些陡坡、垛口和转折意味着什么。越往高处走，风越明显，山势也越开阔，回头能看到城墙沿着山脊往远处连过去，像一条不肯断开的线。体力一般的人不必强求最远点位，挑一段适合自己的路，认真走、认真看，就已经很值得。建议一定要带水，外套别穿太厚但也别完全不带，山上温差比城里明显。北京给人的印象常常是平坦的城市空间，但长城会让你突然记起，这座城市的边缘其实连接着很有力度的山地风景。它不是轻松的散步，却很适合在某一天用来重新感受身体和意志。',
    comments: [
      { username: 'user2', rating: 5, content: '很喜欢你写“走上去才知道长城的难度”这一句，特别真实。' },
      { username: 'user4', rating: 4, content: '清晨出发的建议很有用，避免高峰真的是体验差别最大的点。' },
    ],
  },
  {
    username: 'user3',
    title: '国家博物馆半日深度攻略：先看古代中国再逛临展',
    destination: '中国国家博物馆',
    route: ['北门安检', '古代中国展', '青铜器展区', '瓷器展区', '临时展厅'],
    popularity: 3896,
    content:
      '如果你在北京只能选一个大型博物馆，我很推荐国家博物馆，而且建议别把它当成“顺路打卡”，最好单独留出半天。我的方法是先把重心放在古代中国基本陈列，因为这是最能建立整体时间脉络的一部分。从青铜器到陶俑，再到书画和瓷器，内容非常多，如果没有主线很容易看花。我通常会先扫一遍目录式地看，再在真正感兴趣的展柜前停下来。这样不会被信息量压得太疲惫。逛到后半段再去临展，心情会更轻松一些，也能根据当天是否拥挤灵活调整。国博让我着迷的地方，是它不像某些景点那样靠单一“打卡点”支撑，而是把很多时代的中国并排放到你眼前。你走过一段展线，等于走过一段非常浓缩的历史。建议出发前先看好开放时间和预约情况，馆内空调足、步行量大，舒服的鞋依然很重要。看展中间可以适当坐一会儿，不用追求一次看完全部。博物馆最好的打开方式不是完成任务，而是让某几件文物真正留在你心里。',
    comments: [
      { username: 'user1', rating: 5, content: '这篇很适合做馆内参观顺序参考，主线特别清楚。' },
      { username: 'user4', rating: 4, content: '先看古代中国再看临展这个建议很实用，避免一开始就被信息淹没。' },
    ],
  },
  {
    username: 'user4',
    title: '北海公园与故宫角楼的一天：从白塔到暮色',
    destination: '北海公园',
    route: ['北海北门', '琼华岛', '白塔', '静心斋', '角楼机位'],
    popularity: 3510,
    content:
      '我给这一天起名叫“北京的留白日”。上午先去北海公园，从北海北门进，沿着湖边慢慢走到琼华岛，再往白塔方向上。北海不像故宫那样强烈，也不像什刹海那样热闹，它有一种更平缓的古典气质。站在高处往下看，湖水、殿宇、树影和远处城市轮廓叠在一起，会觉得北京其实很擅长把宏大和松弛放在同一张画面里。中午不必安排太满，公园附近简单吃一点就行。下午可以继续在静心斋附近慢慢逛，等到傍晚再去故宫角楼一带。角楼真正好看的时间不是大中午，而是天色将暗未暗的时候。水面开始收进一点颜色，城墙边的光线变柔，照片很容易出层次。对我来说，这一天的重点不在景点数量，而在“看北京如何变安静”。如果你前几天已经走了很多高强度路线，北海加角楼会是一个很好的缓冲。建议穿轻便一点，给相机或手机留足电量，傍晚那段景色真的很值得慢下来。',
    comments: [
      { username: 'user2', rating: 4, content: '北海和角楼放在一天这个思路很巧，整体节奏很舒服。' },
      { username: 'user3', rating: 5, content: '“北京的留白日”这个描述特别准确，读完就想照着安排一天。' },
    ],
  },
  {
    username: 'user4',
    title: '圆明园遗址公园慢游笔记：废墟、湖面与春天的风',
    destination: '圆明园遗址公园',
    route: ['南门', '福海', '西洋楼遗址', '大水法', '长春园'],
    popularity: 2988,
    content:
      '圆明园给我的感受和北京其他皇家园林都不同。它当然有风景，但更强烈的是一种被时间切开的情绪。那天从南门进园，一开始只是觉得地方很大、湖面很开阔，走到福海附近还会觉得它像一个可以慢慢散步的大公园。可越往西洋楼遗址方向走，那种“遗址”两个字就越具体。残柱、石构件和空出来的空间，让人很难只把这里当作普通景点。大水法前人总是很多，但只要稍微往旁边走开一些，视线会更完整，也更能感受到废墟和天空之间的关系。我最喜欢的是后来走到长春园那一段，树木、草地和湖面把情绪稍微托住了一些，让人不会一直停留在沉重里。圆明园适合慢慢看，不适合匆匆赶路。它会让你意识到，旅行不总是轻松愉快的消费体验，有些地方值得我们带着一点克制和尊重去理解。建议准备充足的步行时间，别只盯着西洋楼核心区，把园子当作一个整体去走，体会会更完整。',
    comments: [
      { username: 'user1', rating: 5, content: '情绪写得很克制，但读完很有力量，特别适合圆明园这个地方。' },
      { username: 'user3', rating: 4, content: '不仅有路线建议，也把遗址公园该有的观看方式表达出来了。' },
    ],
  },
];

const seed = async () => {
  await initializeDatabase();

  if (!AppDataSource) {
    throw new Error('Database initialization failed.');
  }

  const userRepository = AppDataSource.getRepository(User);
  const diaryRepository = AppDataSource.getRepository(Diary);
  const commentRepository = AppDataSource.getRepository(DiaryComment);
  const diaryService = new DiaryService();

  const usernames = ['user1', 'user2', 'user3', 'user4'];
  const users = await userRepository.find({ where: { username: In(usernames) } });
  const userMap = new Map(users.map((user) => [user.username, user]));

  usernames.forEach((username) => {
    const user = userMap.get(username);
    if (!user) {
      throw new Error(`Missing required user: ${username}`);
    }
  });

  console.log('Verified users:');
  usernames.forEach((username) => {
    const user = userMap.get(username)!;
    console.log(`- ${username}: ${user.id}`);
  });

  const targetTitles = beijingDiarySeeds.map((item) => item.title);
  const existingDiaries = await diaryRepository.find({ where: { title: In(targetTitles) } });
  if (existingDiaries.length) {
    const existingDiaryIds = existingDiaries.map((item) => item.id);
    await commentRepository.delete({ diaryId: In(existingDiaryIds) });
    await diaryRepository.delete({ id: In(existingDiaryIds) });
    console.log(`Removed existing seeded diaries: ${existingDiaries.length}`);
  }

  for (const seedDiary of beijingDiarySeeds) {
    const author = userMap.get(seedDiary.username)!;
    const createdDiary = await diaryService.createDiary({
      userId: author.id,
      title: seedDiary.title,
      content: seedDiary.content,
      destination: seedDiary.destination,
      route: seedDiary.route,
      isShared: true,
      imageUrls: [],
    });

    await diaryRepository.update(createdDiary.id, {
      popularity: seedDiary.popularity,
    });

    for (const commentSeed of seedDiary.comments) {
      const commentUser = userMap.get(commentSeed.username);
      if (!commentUser) {
        continue;
      }
      await diaryService.addComment({
        diaryId: createdDiary.id,
        userId: commentUser.id,
        content: commentSeed.content,
        rating: commentSeed.rating,
      });
    }
  }

  const diaryCount = await diaryRepository.count({ where: { title: In(targetTitles) } });
  console.log(`Seeded Beijing diaries: ${diaryCount}`);
};

seed()
  .then(async () => {
    if (AppDataSource?.isInitialized) {
      await AppDataSource.destroy();
    }
  })
  .catch(async (error) => {
    console.error(error);
    if (AppDataSource?.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exitCode = 1;
  });
