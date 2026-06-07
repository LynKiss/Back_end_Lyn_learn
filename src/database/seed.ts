import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from './data-source';
import { User } from '../modules/users/entities/user.entity';
import { UserProfile } from '../modules/users/entities/user-profile.entity';
import { Category } from '../modules/courses/entities/category.entity';
import { Course } from '../modules/courses/entities/course.entity';
import { Unit } from '../modules/courses/entities/unit.entity';
import { Lesson } from '../modules/courses/entities/lesson.entity';
import { Exercise } from '../modules/courses/entities/exercise.entity';
import { Vocabulary } from '../modules/courses/entities/vocabulary.entity';
import { Badge } from '../modules/gamification/entities/badge.entity';
import {
  CefrLevel,
  ExerciseType,
  LessonType,
  UserRole,
} from '../common/enums';
import { slugify } from '../common/utils/slug';

// ---- Dữ liệu khai báo ----

const CATEGORIES = [
  { name: 'Giao tiếp', icon: '💬', description: 'Nghe nói hằng ngày' },
  { name: 'Ngữ pháp', icon: '📘', description: 'Cấu trúc câu, thì' },
  { name: 'Từ vựng', icon: '🔤', description: 'Mở rộng vốn từ' },
  { name: 'Luyện thi', icon: '🎯', description: 'IELTS, TOEIC' },
  { name: 'Công việc', icon: '💼', description: 'Tiếng Anh công sở' },
  { name: 'Trẻ em', icon: '🧒', description: 'Cho người mới/nhỏ tuổi' },
  { name: 'Đồ ăn', icon: '🍜', description: 'Gọi món, nhà hàng, ẩm thực' },
  { name: 'Du lịch', icon: '✈️', description: 'Sân bay, khách sạn, hỏi đường' },
];

interface LessonSpec {
  title: string;
  type: LessonType;
  intro: string;
  richContent?: unknown; // nội dung bespoke (ghi đè bộ sinh tự động)
  vocab: { word: string; phonetic: string; pos: string; meaning: string; example: string }[];
  exercises: {
    type: ExerciseType;
    prompt: string;
    options?: string[];
    correctIndex?: number;
    accepted?: string[];
    content?: unknown;
    answer?: unknown;
  }[];
}

interface CourseSpec {
  title: string;
  level: CefrLevel;
  languageCode?: string;
  levelScale?: string;
  levelCode?: string;
  category: string;
  description: string;
  units: { title: string; lessons: LessonSpec[] }[];
}

const mcq = (prompt: string, options: string[], correctIndex: number) => ({
  type: ExerciseType.MCQ,
  prompt,
  options,
  correctIndex,
});
const fill = (prompt: string, accepted: string[]) => ({
  type: ExerciseType.FILL_BLANK,
  prompt,
  accepted,
});
const reorder = (prompt: string, words: string[]) => ({
  type: ExerciseType.REORDER,
  prompt,
  content: { words },
  answer: { order: words.map((_, i) => i) },
});
const dictation = (prompt: string, text: string) => ({
  type: ExerciseType.DICTATION,
  prompt,
  content: { prompt },
  answer: { text },
});
const translation = (prompt: string, accepted: string[]) => ({
  type: ExerciseType.TRANSLATION,
  prompt,
  content: null,
  answer: { accepted },
});
const matching = (prompt: string, pairs: { left: string; right: string }[]) => ({
  type: ExerciseType.MATCHING,
  prompt,
  content: { pairs },
  answer: { pairs: Object.fromEntries(pairs.map((p) => [p.left, p.right])) },
});

const v = (word: string, phonetic: string, pos: string, meaning: string, example: string) => ({
  word,
  phonetic,
  pos,
  meaning,
  example,
});

// Sinh nội dung rich cho bài học, bám sát từ vựng và loại bài.
function buildLessonContent(lSpec: LessonSpec) {
  const words = lSpec.vocab.map((w) => w.word);
  const wordList = words.join(', ');
  const vocabBlockText = lSpec.vocab
    .map((w) => `• ${w.word} (${w.pos}): ${w.meaning} — ${w.example}`)
    .join('\n');

  return {
    intro: lSpec.intro,
    objectives: [
      words.length
        ? `Ghi nhớ ${words.length} từ vựng trọng tâm: ${wordList}`
        : 'Nắm vững nội dung trọng tâm của bài',
      'Hiểu cách dùng qua ví dụ và ngữ cảnh thực tế',
      `Hoàn thành ${lSpec.exercises.length} bài tập thực hành`,
    ],
    blocks: [
      { type: 'paragraph', title: 'Giới thiệu', text: lSpec.intro },
      ...(vocabBlockText
        ? [{ type: 'paragraph', title: 'Từ vựng trọng tâm', text: vocabBlockText }]
        : []),
    ],
    grammarNotes:
      lSpec.type === LessonType.GRAMMAR
        ? [
            {
              title: 'Ghi chú ngữ pháp',
              explanation:
                'Chú ý cấu trúc câu và cách chia động từ phù hợp với ngữ cảnh của bài.',
              examples: lSpec.vocab.slice(0, 3).map((w) => w.example),
            },
          ]
        : [],
    dialogues:
      lSpec.type === LessonType.SPEAKING || lSpec.type === LessonType.LISTENING
        ? [
            { speaker: 'A', text: lSpec.vocab[0]?.example ?? 'Hello!', translation: lSpec.vocab[0]?.meaning ?? 'Xin chào!' },
            { speaker: 'B', text: lSpec.vocab[1]?.example ?? 'Nice to meet you.', translation: lSpec.vocab[1]?.meaning ?? 'Rất vui được gặp.' },
          ]
        : [],
    readingPassages:
      lSpec.type === LessonType.READING
        ? [
            {
              title: `Bài đọc: ${lSpec.title}`,
              body: `${lSpec.intro}\n\n${lSpec.vocab.map((w) => w.example).join(' ')}`,
            },
          ]
        : [],
    transcript:
      lSpec.type === LessonType.LISTENING
        ? lSpec.vocab.map((w) => w.example).join(' ')
        : null,
    commonMistakes:
      lSpec.type === LessonType.GRAMMAR
        ? [
            {
              wrong: 'I am learn English.',
              correct: 'I am learning English.',
              note: 'Sau am/is/are cần V-ing trong thì hiện tại tiếp diễn.',
            },
          ]
        : [],
  };
}

const COURSES: CourseSpec[] = [
  {
    title: 'Tiếng Anh Nhà hàng & Ẩm thực',
    level: CefrLevel.A2,
    languageCode: 'en',
    levelScale: 'CEFR',
    levelCode: 'A2',
    category: 'Đồ ăn',
    description: 'Gọi món, đọc thực đơn và trò chuyện trong nhà hàng bằng tiếng Anh.',
    units: [
      {
        title: 'Chương 1: Tại nhà hàng',
        lessons: [
          {
            title: 'Gọi món ăn',
            type: LessonType.SPEAKING,
            intro: 'Học cách gọi món và giao tiếp với phục vụ.',
            richContent: {
              intro: 'Khi vào nhà hàng, bạn cần biết cách chào, gọi món và thanh toán.',
              objectives: [
                'Gọi món lịch sự bằng "I would like..."',
                'Hỏi gợi ý món và hỏi giá',
                'Thanh toán và để lại lời cảm ơn',
              ],
              blocks: [
                { type: 'paragraph', title: 'Mẫu câu gọi món', text: 'I would like a bowl of beef noodles, please.\nCould I have the menu, please?\nCan I get the bill, please?' },
              ],
              grammarNotes: [
                { title: 'Lịch sự với "would like"', explanation: '"I would like" (= I want) lịch sự hơn "I want". Theo sau là danh từ hoặc to + động từ.', examples: ['I would like some water.', 'I would like to order now.'] },
              ],
              dialogues: [
                { speaker: 'Phục vụ', text: 'Good evening! Are you ready to order?', translation: 'Chào buổi tối! Quý khách gọi món chưa ạ?' },
                { speaker: 'Khách', text: 'Yes, I would like the beef noodles, please.', translation: 'Vâng, cho tôi món phở bò.' },
                { speaker: 'Phục vụ', text: 'Anything to drink?', translation: 'Quý khách dùng đồ uống gì không?' },
                { speaker: 'Khách', text: 'A glass of iced tea, please.', translation: 'Cho tôi một ly trà đá.' },
              ],
              readingPassages: [],
              transcript: null,
              commonMistakes: [
                { wrong: 'I want noodles.', correct: 'I would like noodles, please.', note: 'Thêm "please" và dùng "would like" cho lịch sự.' },
              ],
            },
            vocab: [
              v('menu', '/ˈmen.juː/', 'noun', 'thực đơn', 'Can I see the menu?'),
              v('order', '/ˈɔː.dər/', 'verb', 'gọi món', 'I want to order now.'),
              v('waiter', '/ˈweɪ.tər/', 'noun', 'phục vụ', 'The waiter is friendly.'),
              v('bill', '/bɪl/', 'noun', 'hóa đơn', 'Can I have the bill?'),
              v('delicious', '/dɪˈlɪʃ.əs/', 'adjective', 'ngon', 'The soup is delicious.'),
            ],
            exercises: [
              mcq('Cách gọi món lịch sự nhất?', ['I want food.', 'Give me food.', 'I would like the soup, please.', 'Food now.'], 2),
              fill('Điền: "Can I have the ____, please?" (hóa đơn)', ['bill']),
              matching('Nối từ với nghĩa', [{ left: 'menu', right: 'thực đơn' }, { left: 'waiter', right: 'phục vụ' }, { left: 'bill', right: 'hóa đơn' }]),
              reorder('Sắp xếp: gọi món lịch sự', ['I', 'would', 'like', 'noodles']),
            ],
          },
          {
            title: 'Đồ ăn & thức uống',
            type: LessonType.VOCAB,
            intro: 'Từ vựng món ăn và đồ uống thông dụng.',
            vocab: [
              v('rice', '/raɪs/', 'noun', 'cơm', 'I eat rice every day.'),
              v('noodles', '/ˈnuː.dəlz/', 'noun', 'mì/phở', 'Beef noodles are tasty.'),
              v('soup', '/suːp/', 'noun', 'súp/canh', 'Hot soup in winter.'),
              v('coffee', '/ˈkɒf.i/', 'noun', 'cà phê', 'A cup of coffee, please.'),
            ],
            exercises: [
              mcq('"noodles" nghĩa là gì?', ['cơm', 'mì/phở', 'súp', 'cà phê'], 1),
              translation('Dịch sang tiếng Anh: "cà phê"', ['coffee']),
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Tiếng Anh Du lịch',
    level: CefrLevel.A2,
    languageCode: 'en',
    levelScale: 'CEFR',
    levelCode: 'A2',
    category: 'Du lịch',
    description: 'Tự tin ở sân bay, khách sạn và hỏi đường khi đi du lịch.',
    units: [
      {
        title: 'Chương 1: Sân bay & Khách sạn',
        lessons: [
          {
            title: 'Tại sân bay',
            type: LessonType.LISTENING,
            intro: 'Nghe thông báo và làm thủ tục ở sân bay.',
            richContent: {
              intro: 'Ở sân bay bạn cần hiểu thông báo và trả lời nhân viên làm thủ tục.',
              objectives: [
                'Hiểu từ vựng sân bay: passport, gate, boarding pass',
                'Nghe và nắm thông tin chuyến bay',
                'Trả lời câu hỏi làm thủ tục',
              ],
              blocks: [
                { type: 'paragraph', title: 'Thông báo mẫu', text: 'Flight VN123 to Tokyo is now boarding at gate 12.' },
              ],
              grammarNotes: [],
              dialogues: [
                { speaker: 'Nhân viên', text: 'May I see your passport and boarding pass?', translation: 'Cho tôi xem hộ chiếu và thẻ lên máy bay?' },
                { speaker: 'Khách', text: 'Here you are.', translation: 'Của bạn đây.' },
                { speaker: 'Nhân viên', text: 'Your gate is number 12. Have a nice flight!', translation: 'Cửa của bạn là số 12. Chúc chuyến bay vui vẻ!' },
              ],
              readingPassages: [],
              transcript: 'May I see your passport and boarding pass? Your gate is number 12. Flight VN123 to Tokyo is now boarding.',
              commonMistakes: [],
            },
            vocab: [
              v('airport', '/ˈeə.pɔːt/', 'noun', 'sân bay', 'I am at the airport.'),
              v('passport', '/ˈpɑːs.pɔːt/', 'noun', 'hộ chiếu', 'Show me your passport.'),
              v('gate', '/ɡeɪt/', 'noun', 'cửa ra máy bay', 'Go to gate 12.'),
              v('luggage', '/ˈlʌɡ.ɪdʒ/', 'noun', 'hành lý', 'My luggage is heavy.'),
            ],
            exercises: [
              mcq('"passport" nghĩa là gì?', ['vé', 'hộ chiếu', 'cửa', 'hành lý'], 1),
              fill('Điền: "Go to ____ 12." (cửa ra máy bay)', ['gate']),
              dictation('Nghe và điền từ: hành lý', 'luggage'),
            ],
          },
          {
            title: 'Hỏi đường',
            type: LessonType.SPEAKING,
            intro: 'Hỏi và chỉ đường cơ bản.',
            richContent: {
              intro: 'Khi lạc đường, bạn cần biết hỏi và hiểu chỉ dẫn.',
              objectives: ['Hỏi đường lịch sự', 'Hiểu chỉ dẫn trái/phải/thẳng', 'Cảm ơn người giúp'],
              blocks: [
                { type: 'paragraph', title: 'Mẫu câu', text: 'Excuse me, how do I get to the station?\nGo straight, then turn left.' },
              ],
              grammarNotes: [
                { title: 'Câu mệnh lệnh chỉ đường', explanation: 'Dùng động từ nguyên thể đầu câu: Go, Turn, Take.', examples: ['Go straight.', 'Turn right at the corner.'] },
              ],
              dialogues: [
                { speaker: 'Khách', text: 'Excuse me, where is the station?', translation: 'Xin lỗi, nhà ga ở đâu?' },
                { speaker: 'Người dân', text: 'Go straight and turn left at the corner.', translation: 'Đi thẳng rồi rẽ trái ở góc đường.' },
              ],
              readingPassages: [],
              transcript: null,
              commonMistakes: [
                { wrong: 'Where station?', correct: 'Where is the station?', note: 'Cần "is the" trong câu hỏi.' },
              ],
            },
            vocab: [
              v('left', '/left/', 'noun', 'bên trái', 'Turn left.'),
              v('right', '/raɪt/', 'noun', 'bên phải', 'Turn right.'),
              v('straight', '/streɪt/', 'adverb', 'thẳng', 'Go straight.'),
              v('corner', '/ˈkɔː.nər/', 'noun', 'góc đường', 'At the corner.'),
            ],
            exercises: [
              mcq('"turn left" nghĩa là gì?', ['rẽ phải', 'đi thẳng', 'rẽ trái', 'dừng lại'], 2),
              reorder('Sắp xếp câu chỉ đường', ['Go', 'straight', 'and', 'turn', 'right']),
              matching('Nối hướng', [{ left: 'left', right: 'trái' }, { left: 'right', right: 'phải' }, { left: 'straight', right: 'thẳng' }]),
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'HSK 1 - Tiếng Trung nhập môn',
    level: CefrLevel.A1,
    languageCode: 'zh',
    levelScale: 'HSK',
    levelCode: 'HSK1',
    category: 'Giao tiếp',
    description: 'Khóa HSK 1: chữ Hán, pinyin, chào hỏi và số đếm cơ bản.',
    units: [
      {
        title: 'Bài 1: 你好 (Xin chào)',
        lessons: [
          {
            title: 'Chào hỏi & giới thiệu',
            type: LessonType.VOCAB,
            intro: 'Các từ chào hỏi cơ bản trong tiếng Trung (HSK 1).',
            richContent: {
              intro: 'Học chữ Hán, pinyin và cách dùng qua ví dụ.',
              objectives: [
                'Đọc đúng pinyin: nǐ hǎo, xièxie, zàijiàn',
                'Viết và nhận mặt chữ: 你好, 谢谢, 再见',
                'Tự giới thiệu đơn giản bằng tiếng Trung',
              ],
              blocks: [
                { type: 'paragraph', title: 'Mẹo phát âm', text: 'Tiếng Trung có 4 thanh điệu. Ví dụ "mā (妈) - má (麻) - mǎ (马) - mà (骂)" khác nghĩa hoàn toàn.' },
              ],
              grammarNotes: [
                { title: 'Câu "是" (là)', explanation: 'Cấu trúc: A + 是 + B (A là B). Phủ định: A + 不是 + B.', examples: ['我是学生。', '我不是中国人。'] },
              ],
              dialogues: [
                { speaker: 'A', text: '你好！', translation: 'Xin chào!' },
                { speaker: 'B', text: '你好！你叫什么名字？', translation: 'Xin chào! Bạn tên gì?' },
                { speaker: 'A', text: '我叫小明。', translation: 'Tôi tên Tiểu Minh.' },
                { speaker: 'B', text: '很高兴认识你。', translation: 'Rất vui được gặp bạn.' },
              ],
              readingPassages: [],
              transcript: null,
              commonMistakes: [
                { wrong: '我是中国。', correct: '我是中国人。', note: 'Cần thêm 人 (người) để chỉ quốc tịch.' },
              ],
            },
            vocab: [
              v('你好', 'nǐ hǎo', 'cụm từ', 'xin chào', '你好！我叫小明。'),
              v('谢谢', 'xièxie', 'động từ', 'cảm ơn', '谢谢你的帮助。'),
              v('再见', 'zàijiàn', 'cụm từ', 'tạm biệt', '再见，明天见！'),
              v('我', 'wǒ', 'đại từ', 'tôi', '我是学生。'),
              v('你', 'nǐ', 'đại từ', 'bạn', '你好吗？'),
              v('是', 'shì', 'động từ', 'là', '我是越南人。'),
              v('不', 'bù', 'phó từ', 'không', '我不是中国人。'),
              v('人', 'rén', 'danh từ', 'người', '他是好人。'),
            ],
            exercises: [
              mcq('"你好" nghĩa là gì?', ['tạm biệt', 'xin chào', 'cảm ơn', 'xin lỗi'], 1),
              mcq('"谢谢" nghĩa là gì?', ['cảm ơn', 'xin chào', 'tạm biệt', 'không'], 0),
              matching('Nối chữ Hán với nghĩa', [
                { left: '你好', right: 'xin chào' },
                { left: '谢谢', right: 'cảm ơn' },
                { left: '再见', right: 'tạm biệt' },
              ]),
            ],
          },
          {
            title: 'Số đếm 1-5',
            type: LessonType.VOCAB,
            intro: 'Học số đếm cơ bản trong tiếng Trung.',
            vocab: [
              v('一', 'yī', 'số từ', 'một', '我有一个哥哥。'),
              v('二', 'èr', 'số từ', 'hai', '我要二号。'),
              v('三', 'sān', 'số từ', 'ba', '三个人。'),
              v('四', 'sì', 'số từ', 'bốn', '四点钟。'),
              v('五', 'wǔ', 'số từ', 'năm', '现在五点了。'),
            ],
            exercises: [
              mcq('"三" là số mấy?', ['1', '2', '3', '4'], 2),
              matching('Nối số với chữ Hán', [
                { left: '一', right: 'một' },
                { left: '三', right: 'ba' },
                { left: '五', right: 'năm' },
              ]),
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Tiếng Anh giao tiếp cơ bản',
    level: CefrLevel.A1,
    category: 'Giao tiếp',
    description: 'Khóa nhập môn cho người mới: chào hỏi, gia đình, số đếm, mua sắm.',
    units: [
      {
        title: 'Chương 1: Chào hỏi & Giới thiệu',
        lessons: [
          {
            title: 'Chào hỏi cơ bản',
            type: LessonType.VOCAB,
            intro: 'Các câu chào và giới thiệu bản thân.',
            vocab: [
              v('hello', '/həˈloʊ/', 'exclamation', 'xin chào', 'Hello, how are you?'),
              v('goodbye', '/ˌɡʊdˈbaɪ/', 'exclamation', 'tạm biệt', 'Goodbye, see you tomorrow.'),
              v('name', '/neɪm/', 'noun', 'tên', 'My name is Anna.'),
              v('nice', '/naɪs/', 'adjective', 'tốt, dễ chịu', 'Nice to meet you.'),
            ],
            exercises: [
              mcq('"hello" nghĩa là gì?', ['tạm biệt', 'xin chào', 'cảm ơn', 'xin lỗi'], 1),
              mcq('Câu giới thiệu tên đúng là?', ['My name is Anna.', 'I goodbye Anna.', 'Hello tomorrow.', 'Nice name you.'], 0),
              fill('Điền: "____ to meet you." (rất vui được gặp bạn)', ['nice']),
            ],
          },
          {
            title: 'Hỏi thăm sức khỏe',
            type: LessonType.SPEAKING,
            intro: 'Cách hỏi và trả lời "How are you?".',
            vocab: [
              v('fine', '/faɪn/', 'adjective', 'khỏe, ổn', "I'm fine, thank you."),
              v('thanks', '/θæŋks/', 'noun', 'cảm ơn', 'Thanks a lot!'),
              v('how', '/haʊ/', 'adverb', 'như thế nào', 'How are you?'),
            ],
            exercises: [
              mcq('Trả lời "How are you?" phù hợp:', ['I am a teacher.', "I'm fine, thanks.", 'My name is Tom.', 'Goodbye!'], 1),
              fill('Điền: "How ____ you?"', ['are']),
            ],
          },
        ],
      },
      {
        title: 'Chương 2: Gia đình & Số đếm',
        lessons: [
          {
            title: 'Từ vựng gia đình',
            type: LessonType.VOCAB,
            intro: 'Các thành viên trong gia đình.',
            vocab: [
              v('family', '/ˈfæm.əl.i/', 'noun', 'gia đình', 'My family is big.'),
              v('mother', '/ˈmʌð.ər/', 'noun', 'mẹ', 'My mother is a teacher.'),
              v('father', '/ˈfɑː.ðər/', 'noun', 'bố', 'My father works in a bank.'),
              v('sister', '/ˈsɪs.tər/', 'noun', 'chị/em gái', 'I have one sister.'),
              v('brother', '/ˈbrʌð.ər/', 'noun', 'anh/em trai', 'My brother is tall.'),
            ],
            exercises: [
              mcq('"family" nghĩa là gì?', ['bạn bè', 'gia đình', 'trường học', 'công việc'], 1),
              mcq('"mother" nghĩa là gì?', ['bố', 'mẹ', 'chị gái', 'anh trai'], 1),
              fill('Điền: "My ____ is a teacher." (mẹ tôi)', ['mother']),
            ],
          },
          {
            title: 'Số đếm 1-10',
            type: LessonType.VOCAB,
            intro: 'Học đếm từ một đến mười.',
            vocab: [
              v('one', '/wʌn/', 'number', 'một', 'I have one cat.'),
              v('two', '/tuː/', 'number', 'hai', 'Two coffees, please.'),
              v('three', '/θriː/', 'number', 'ba', 'Three books on the table.'),
            ],
            exercises: [
              mcq('"three" là số mấy?', ['1', '2', '3', '4'], 2),
              fill('Điền số bằng chữ: "I have ____ cat." (1)', ['one']),
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Ngữ pháp nền tảng',
    level: CefrLevel.A2,
    category: 'Ngữ pháp',
    description: 'Các thì cơ bản và cấu trúc câu thường dùng.',
    units: [
      {
        title: 'Chương 1: Thì hiện tại',
        lessons: [
          {
            title: 'Hiện tại đơn (Present Simple)',
            type: LessonType.GRAMMAR,
            intro: 'Dùng cho thói quen và sự thật hiển nhiên.',
            vocab: [
              v('always', '/ˈɔːl.weɪz/', 'adverb', 'luôn luôn', 'I always drink coffee.'),
              v('usually', '/ˈjuː.ʒu.ə.li/', 'adverb', 'thường', 'She usually walks to work.'),
            ],
            exercises: [
              mcq('Chọn câu đúng:', ['She go to school.', 'She goes to school.', 'She going school.', 'She to go school.'], 1),
              fill('Chia động từ: "He ____ (play) football." ', ['plays']),
            ],
          },
          {
            title: 'Hiện tại tiếp diễn',
            type: LessonType.GRAMMAR,
            intro: 'Diễn tả hành động đang xảy ra.',
            vocab: [
              v('now', '/naʊ/', 'adverb', 'bây giờ', 'I am studying now.'),
            ],
            exercises: [
              mcq('"I ____ reading now." chọn đáp án đúng', ['am', 'is', 'are', 'be'], 0),
              fill('Điền: "They ____ playing." (số nhiều)', ['are']),
            ],
          },
        ],
      },
    ],
  },
  {
    title: '1000 từ vựng thông dụng',
    level: CefrLevel.A2,
    category: 'Từ vựng',
    description: 'Học các từ vựng xuất hiện nhiều nhất theo chủ đề.',
    units: [
      {
        title: 'Chương 1: Đồ ăn & Thức uống',
        lessons: [
          {
            title: 'Đồ ăn hằng ngày',
            type: LessonType.VOCAB,
            intro: 'Từ vựng về thực phẩm.',
            vocab: [
              v('rice', '/raɪs/', 'noun', 'cơm/gạo', 'I eat rice every day.'),
              v('bread', '/bred/', 'noun', 'bánh mì', 'Bread and butter.'),
              v('water', '/ˈwɔː.tər/', 'noun', 'nước', 'A glass of water.'),
              v('coffee', '/ˈkɒf.i/', 'noun', 'cà phê', 'I love coffee.'),
            ],
            exercises: [
              mcq('"water" nghĩa là gì?', ['nước', 'cơm', 'bánh mì', 'cà phê'], 0),
              fill('Điền: "A glass of ____." (nước)', ['water']),
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Tiếng Anh giao tiếp trung cấp',
    level: CefrLevel.B1,
    category: 'Giao tiếp',
    description: 'Giao tiếp trôi chảy trong các tình huống thực tế.',
    units: [
      {
        title: 'Chương 1: Du lịch',
        lessons: [
          {
            title: 'Tại sân bay',
            type: LessonType.LISTENING,
            intro: 'Từ vựng và mẫu câu ở sân bay.',
            vocab: [
              v('airport', '/ˈeə.pɔːt/', 'noun', 'sân bay', 'I am at the airport.'),
              v('passport', '/ˈpɑːs.pɔːt/', 'noun', 'hộ chiếu', 'Show me your passport.'),
              v('flight', '/flaɪt/', 'noun', 'chuyến bay', 'My flight is delayed.'),
            ],
            exercises: [
              mcq('"passport" nghĩa là gì?', ['vé', 'hộ chiếu', 'sân bay', 'hành lý'], 1),
              fill('Điền: "My ____ is delayed." (chuyến bay)', ['flight']),
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Tiếng Anh công sở',
    level: CefrLevel.B1,
    category: 'Công việc',
    description: 'Email, họp hành, thuyết trình trong môi trường công việc.',
    units: [
      {
        title: 'Chương 1: Email & Giao tiếp',
        lessons: [
          {
            title: 'Viết email chuyên nghiệp',
            type: LessonType.WRITING,
            intro: 'Cấu trúc một email công việc.',
            vocab: [
              v('regards', '/rɪˈɡɑːdz/', 'noun', 'trân trọng', 'Best regards, Anna.'),
              v('attach', '/əˈtætʃ/', 'verb', 'đính kèm', 'I attach the report.'),
              v('meeting', '/ˈmiː.tɪŋ/', 'noun', 'cuộc họp', 'We have a meeting at 3pm.'),
            ],
            exercises: [
              mcq('Cụm kết thư trang trọng:', ['See ya!', 'Best regards', 'Bye bye', 'Later'], 1),
              fill('Điền: "I ____ the report." (đính kèm)', ['attach']),
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Luyện thi IELTS Foundation',
    level: CefrLevel.B2,
    category: 'Luyện thi',
    description: 'Làm quen 4 kỹ năng IELTS và chiến lược làm bài.',
    units: [
      {
        title: 'Chương 1: Writing Task 1',
        lessons: [
          {
            title: 'Mô tả biểu đồ',
            type: LessonType.WRITING,
            intro: 'Từ vựng mô tả xu hướng tăng/giảm.',
            vocab: [
              v('increase', '/ɪnˈkriːs/', 'verb', 'tăng', 'Sales increased sharply.'),
              v('decrease', '/dɪˈkriːs/', 'verb', 'giảm', 'The number decreased.'),
              v('trend', '/trend/', 'noun', 'xu hướng', 'An upward trend.'),
            ],
            exercises: [
              mcq('"increase" nghĩa là gì?', ['giảm', 'tăng', 'ổn định', 'biến mất'], 1),
              fill('Điền: "Sales ____ sharply." (tăng, quá khứ)', ['increased']),
            ],
          },
        ],
      },
    ],
  },
];

function generatedLanguageCourses(): CourseSpec[] {
  const packs = [
    {
      languageCode: 'zh',
      levelScale: 'HSK',
      levels: ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'],
      prefix: 'Tiếng Trung',
      words: [
        ['你好', 'xin chào', 'nǐ hǎo'],
        ['谢谢', 'cảm ơn', 'xiè xie'],
        ['学习', 'học tập', 'xué xí'],
        ['工作', 'công việc', 'gōng zuò'],
      ],
    },
    {
      languageCode: 'ja',
      levelScale: 'JLPT',
      levels: ['N5', 'N4', 'N3', 'N2', 'N1', 'N1'],
      prefix: 'Tiếng Nhật',
      words: [
        ['こんにちは', 'xin chào', 'konnichiwa'],
        ['ありがとう', 'cảm ơn', 'arigatou'],
        ['勉強', 'học tập', 'benkyou'],
        ['仕事', 'công việc', 'shigoto'],
      ],
    },
  ];

  return packs.flatMap((pack) =>
    pack.levels.map((levelCode, index) => ({
      title: `${pack.prefix} ${levelCode} - Kỹ năng tổng hợp`,
      level: CefrLevel.A1,
      languageCode: pack.languageCode,
      levelScale: pack.levelScale,
      levelCode,
      category: index % 2 === 0 ? 'Giao tiếp' : 'Từ vựng',
      description: `Khóa ${pack.prefix} ${levelCode} với từ vựng, hội thoại, đọc hiểu, nghe và bài tập đa dạng.`,
      units: [
        {
          title: `Unit 1: Nền tảng ${levelCode}`,
          lessons: [
            {
              title: `${pack.prefix} ${levelCode}: Chào hỏi và giới thiệu`,
              type: LessonType.VOCAB,
              intro: `Mục tiêu: nắm từ khóa, mẫu câu và cách phản xạ trong tình huống chào hỏi ${pack.prefix}.`,
              vocab: pack.words.map(([word, meaning, phonetic]) =>
                v(word, phonetic, 'phrase', meaning, `${word} - ${meaning}`),
              ),
              exercises: [
                mcq(`Từ "${pack.words[0][0]}" nghĩa là gì?`, ['tạm biệt', pack.words[0][1], 'xin lỗi', 'hẹn gặp lại'], 1),
                fill(`Điền nghĩa của "${pack.words[1][0]}"`, [pack.words[1][1]]),
                matching('Nối từ với nghĩa', pack.words.map(([word, meaning]) => ({ left: word, right: meaning }))),
                reorder('Sắp xếp câu mẫu', ['I', 'am', 'learning', pack.prefix]),
              ],
            },
            {
              title: `${pack.prefix} ${levelCode}: Đọc và nghe ngắn`,
              type: LessonType.READING,
              intro: `Bài đọc ngắn có transcript và câu hỏi kiểm tra hiểu nội dung.`,
              vocab: pack.words.slice(0, 3).map(([word, meaning, phonetic]) =>
                v(word, phonetic, 'word', meaning, `${word} xuất hiện trong đoạn đọc.`),
              ),
              exercises: [
                dictation('Nghe/nhớ và gõ lại câu mẫu', `${pack.words[0][0]} ${pack.words[1][0]}`),
                translation('Dịch: Tôi đang học ngoại ngữ.', ['I am learning a foreign language.', 'I am learning language']),
                {
                  type: ExerciseType.READING_COMPREHENSION,
                  prompt: 'Ý chính của đoạn đọc là gì?',
                  content: { options: ['Chào hỏi', 'Thời tiết', 'Mua sắm'] },
                  answer: { correctIndex: 0 },
                },
              ],
            },
            {
              title: `${pack.prefix} ${levelCode}: Viết và nói`,
              type: LessonType.SPEAKING,
              intro: `Thực hành viết và nói với phản hồi AI theo ngôn ngữ mẹ đẻ của học viên.`,
              vocab: [],
              exercises: [
                {
                  type: ExerciseType.WRITING,
                  prompt: `Viết 4-5 câu giới thiệu bản thân bằng ${pack.prefix}.`,
                  content: null,
                  answer: null,
                },
                {
                  type: ExerciseType.SPEAKING,
                  prompt: `Ghi âm phần tự giới thiệu ngắn bằng ${pack.prefix}.`,
                  content: null,
                  answer: null,
                },
              ],
            },
          ],
        },
      ],
    })),
  );
}

async function seed() {
  const ds = await AppDataSource.initialize();
  console.log('🌱 Bắt đầu seed...');

  // 1. Admin + 1 học viên demo
  const userRepo = ds.getRepository(User);
  const profileRepo = ds.getRepository(UserProfile);

  async function ensureUser(
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    level: CefrLevel | null,
  ) {
    let u = await userRepo.findOne({ where: { email } });
    if (u) return u;
    u = await userRepo.save(
      userRepo.create({
        email,
        passwordHash: await bcrypt.hash(password, 10),
        displayName,
        role,
        currentLevel: level,
      }),
    );
    await profileRepo.save(
      profileRepo.create({ userId: u.id, totalXp: 0, currentStreak: 0 }),
    );
    return u;
  }

  await ensureUser('admin@weblyn.com', 'admin123', 'Quản trị viên', UserRole.ADMIN, CefrLevel.C2);
  await ensureUser('hocvien@weblyn.com', 'hocvien123', 'Học viên Demo', UserRole.STUDENT, CefrLevel.A1);
  console.log('✅ Admin: admin@weblyn.com/admin123 · Học viên: hocvien@weblyn.com/hocvien123');

  // 2. Dọn dữ liệu nội dung cũ để seed lại sạch (giữ users)
  await ds.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of [
    'exercise_attempts',
    'lesson_progress',
    'enrollments',
    'vocabulary_reviews',
    'saved_vocabulary',
    'flashcard_decks',
    'course_reviews',
    'user_badges',
    'badges',
    'xp_events',
    'learning_path_items',
    'learning_paths',
    'placement_results',
    'writing_feedbacks',
    'writing_submissions',
    'speaking_feedbacks',
    'speaking_submissions',
    'vocabulary',
    'exercises',
    'lessons',
    'units',
    'courses',
    'categories',
  ]) {
    await ds.query(`TRUNCATE TABLE \`${t}\``);
  }
  await ds.query('SET FOREIGN_KEY_CHECKS = 1');

  // 3. Danh mục
  const catRepo = ds.getRepository(Category);
  const catMap = new Map<string, Category>();
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    const saved = await catRepo.save(
      catRepo.create({
        name: c.name,
        slug: slugify(c.name),
        icon: c.icon,
        description: c.description,
        orderIndex: i,
      }),
    );
    catMap.set(c.name, saved);
  }
  console.log(`✅ ${CATEGORIES.length} danh mục.`);

  const badgeRepo = ds.getRepository(Badge);
  await badgeRepo.save([
    badgeRepo.create({
      code: 'first_steps',
      name: 'First Steps',
      description: 'Đạt 10 XP đầu tiên',
      icon: 'spark',
      xpThreshold: 10,
    }),
    badgeRepo.create({
      code: 'steady_learner',
      name: 'Steady Learner',
      description: 'Đạt 100 XP',
      icon: 'flame',
      xpThreshold: 100,
    }),
    badgeRepo.create({
      code: 'language_builder',
      name: 'Language Builder',
      description: 'Đạt 500 XP',
      icon: 'trophy',
      xpThreshold: 500,
    }),
  ]);
  console.log('✅ 3 huy hiệu gamification.');

  // 4. Khóa học + cây nội dung
  const courseRepo = ds.getRepository(Course);
  const unitRepo = ds.getRepository(Unit);
  const lessonRepo = ds.getRepository(Lesson);
  const vocabRepo = ds.getRepository(Vocabulary);
  const exRepo = ds.getRepository(Exercise);

  let counts = { courses: 0, units: 0, lessons: 0, vocab: 0, exercises: 0 };

  const allCourses = [...COURSES, ...generatedLanguageCourses()];

  for (let ci = 0; ci < allCourses.length; ci++) {
    const spec = allCourses[ci];
    const course = await courseRepo.save(
      courseRepo.create({
        title: spec.title,
        slug: `${slugify(spec.title)}-${ci}`,
        description: spec.description,
        level: spec.level,
        language: spec.languageCode ?? 'en',
        languageCode: spec.languageCode ?? 'en',
        levelScale: (spec.levelScale as any) ?? 'CEFR',
        levelCode: spec.levelCode ?? spec.level,
        isPublished: true,
        orderIndex: ci,
        categoryId: catMap.get(spec.category)?.id ?? null,
      }),
    );
    counts.courses++;

    for (let ui = 0; ui < spec.units.length; ui++) {
      const uSpec = spec.units[ui];
      const unit = await unitRepo.save(
        unitRepo.create({ courseId: course.id, title: uSpec.title, orderIndex: ui }),
      );
      counts.units++;

      for (let li = 0; li < uSpec.lessons.length; li++) {
        const lSpec = uSpec.lessons[li];
        const lesson = await lessonRepo.save(
          lessonRepo.create({
            unitId: unit.id,
            title: lSpec.title,
            slug: slugify(lSpec.title) + '-' + course.id + '-' + unit.id + '-' + li,
            lessonType: lSpec.type,
            content: lSpec.richContent ?? buildLessonContent(lSpec),
            estimatedMinutes: 10 + li * 2,
            orderIndex: li,
            isPublished: true,
          }),
        );
        counts.lessons++;

        for (const vSpec of lSpec.vocab) {
          await vocabRepo.save(
            vocabRepo.create({
              lessonId: lesson.id,
              word: vSpec.word,
              phonetic: vSpec.phonetic,
              partOfSpeech: vSpec.pos,
              meaning: vSpec.meaning,
              example: vSpec.example,
            }),
          );
          counts.vocab++;
        }

        for (let ei = 0; ei < lSpec.exercises.length; ei++) {
          const eSpec = lSpec.exercises[ei];
          await exRepo.save(
            exRepo.create({
              lessonId: lesson.id,
              type: eSpec.type,
              prompt: eSpec.prompt,
              content: eSpec.content ?? (eSpec.options ? { options: eSpec.options } : null),
              answer:
                eSpec.answer ??
                (eSpec.type === ExerciseType.MCQ
                  ? { correctIndex: eSpec.correctIndex }
                  : { accepted: eSpec.accepted }),
              points: 10,
              orderIndex: ei,
            }),
          );
          counts.exercises++;
        }
      }
    }
  }

  console.log(
    `✅ Tạo ${counts.courses} khóa, ${counts.units} chương, ${counts.lessons} bài, ${counts.vocab} từ vựng, ${counts.exercises} bài tập.`,
  );
  await ds.destroy();
  console.log('🎉 Seed hoàn tất!');
}

seed().catch((e) => {
  console.error('❌ Seed lỗi:', e);
  process.exit(1);
});
