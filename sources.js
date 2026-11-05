/* 每題的資料來源。故事文字都是自己改寫，沒有抄錄來源原文；這裡列的是實際查證過年份、人名、用途的頁面。
   沒有列出的題目（LIFE）是一般生活記憶，沒有單一出處。新增題目時要真的查過再列。 */
function wiki_(t){ return ['維基百科〈' + t + '〉', 'https://zh.wikipedia.org/zh-tw/' + encodeURIComponent(t)]; }
var MEMORY_CC = ['國家文化記憶庫〈上進興打鐵店〉', 'https://memory.culture.tw/Home/Detail?Id=283275&IndexCode=Culture_Place'];
var SOURCES = {
  abacus:[wiki_('算盤')], lantern:[wiki_('煤油燈')], iron:[wiki_('熨斗')], sewing:[wiki_('縫紉機')], dialphone:[wiki_('電話')],
  radio:[wiki_('收音機')], tv:[wiki_('臺灣電視公司')], washboard:[wiki_('洗衣板')], mosquito:[wiki_('蚊帳')], cooker:[wiki_('大同電鍋')],
  thermos:[wiki_('保溫瓶')], type:[wiki_('日星鑄字行')], marbles:[wiki_('彈珠')], dragonfly:[wiki_('竹蜻蜓')], cassette:[wiki_('卡式錄音帶')],
  gramophone:[wiki_('留聲機')], cape:[wiki_('蓑衣')],
  steam:[wiki_('台鐵CK124號蒸汽機車')], bluetrain:[wiki_('普快車')], sugar:[wiki_('臺灣糖業鐵路')], trishaw:[wiki_('三輪車')], oxplate:[wiki_('牛車')],
  shop:[wiki_('雜貨店')], postbox:[['Wikipedia “Post box”（各地郵筒顏色）', 'https://en.wikipedia.org/wiki/Post_box']], coinphone:[wiki_('公共電話')],
  salt:[wiki_('北門井仔腳瓦盤鹽田'), wiki_('臺鹽實業')], tobacco:[wiki_('美濃區'), wiki_('水湳菸樓')], smith:[MEMORY_CC],
  mill:[['Wikimedia Commons 照片說明〈菁寮－義昌碾米廠〉', 'https://commons.wikimedia.org/wiki/Category:Houjingliao_Yichang_Rice_Milling_Plant']],
  opera:[wiki_('歌仔戲')], puppet:[wiki_('雲州大儒俠')], sanheyuan:[wiki_('三合院')], alishan:[wiki_('阿里山林業鐵路')], buffalo:[wiki_('水牛')],
  s_chunfeng:[wiki_('望春風')], s_yuye:[wiki_('雨夜花')], s_siji:[wiki_('四季紅')], s_puopo:[wiki_('補破網')], s_rouzong:[wiki_('燒肉粽')],
  s_diudiu:[wiki_('丟丟銅仔')], s_tianhei:[wiki_('天烏烏')], s_anping:[wiki_('安平追想曲')], s_gunv:[wiki_('陳芬蘭')], s_jiuqing:[wiki_('舊情綿綿'), wiki_('洪一峰')],
  s_yueliang:[wiki_('月亮代表我的心')], s_xiaocheng:[wiki_('小城故事')], s_penghu:[wiki_('潘安邦'), wiki_('葉佳修')], s_jiugan:[wiki_('蘇芮')]
};
var LIFE = '一般生活記憶，沒有單一出處，各地經驗可能不同';
