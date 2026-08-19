import { IELTSSpeakingTopic } from '@/types/ielts';

export const SEED_IELTS_TOPICS: IELTSSpeakingTopic[] = [
  {
    id: 'topic-tech-innovation',
    title: 'Technology & Artificial Intelligence',
    category: 'Technology',
    part1_questions: [
      {
        id: 'p1-q1',
        topic_title: 'Work / Study & Daily Tech',
        question_text: 'What kind of technology do you use every day for work or study?',
      },
      {
        id: 'p1-q2',
        topic_title: 'Communication Apps',
        question_text: 'Do you prefer communicating with friends face-to-face or via messaging apps?',
      },
      {
        id: 'p1-q3',
        topic_title: 'Future Gadgets',
        question_text: 'Is there any new piece of technology you would like to buy in the future?',
      },
      {
        id: 'p1-q4',
        topic_title: 'Screen Time',
        question_text: 'How much time do you spend on digital devices each day?',
      },
    ],
    part2_cue_card: {
      id: 'p2-cue1',
      topic_title: 'Describe a useful technological device',
      cue_card_title: 'Describe a piece of technology that you find very useful in your daily life.',
      prompt_lead: 'You should say:',
      bullet_points: [
        'What it is and when you got it',
        'How often you use this technology',
        'What main features or functions it has',
        'And explain why you consider it so useful to you.',
      ],
      follow_up_question: 'Do you think older people find it easy to use this device?',
    },
    part3_questions: [
      {
        id: 'p3-q1',
        topic_title: 'Impact on Employment',
        question_text: 'How has artificial intelligence changed the job market in your country?',
      },
      {
        id: 'p3-q2',
        topic_title: 'Work-Life Balance',
        question_text: 'Do smartphones make it harder for employees to disconnect from work after hours?',
      },
      {
        id: 'p3-q3',
        topic_title: 'Future Education',
        question_text: 'In your opinion, will virtual classrooms ever completely replace traditional university lectures?',
      },
    ],
  },
  {
    id: 'topic-environment-cities',
    title: 'Urban Environment & Sustainable Living',
    category: 'Environment',
    part1_questions: [
      {
        id: 'p1-env-q1',
        topic_title: 'Hometown & Living Space',
        question_text: 'Do you live in a city or in the countryside?',
      },
      {
        id: 'p1-env-q2',
        topic_title: 'Green Spaces',
        question_text: 'Are there many parks or public gardens near your home?',
      },
      {
        id: 'p1-env-q3',
        topic_title: 'Recycling Habits',
        question_text: 'Does your family regularly recycle household waste?',
      },
      {
        id: 'p1-env-q4',
        topic_title: 'Weather & Mood',
        question_text: 'What type of weather do you enjoy the most?',
      },
    ],
    part2_cue_card: {
      id: 'p2-cue2',
      topic_title: 'Describe an eco-friendly place',
      cue_card_title: 'Describe a green park or natural environment you visited that impressed you.',
      prompt_lead: 'You should say:',
      bullet_points: [
        'Where this place is located',
        'Who you went there with and when',
        'What activities people can do in this green space',
        'And explain why you enjoyed visiting this environment.',
      ],
      follow_up_question: 'Would you like to visit this park again in the near future?',
    },
    part3_questions: [
      {
        id: 'p3-env-q1',
        topic_title: 'Government Responsibility',
        question_text: 'What measures should governments take to reduce urban air pollution?',
      },
      {
        id: 'p3-env-q2',
        topic_title: 'Individual vs Corporate Action',
        question_text: 'Do you believe individual efforts or corporate regulations have a greater impact on environmental protection?',
      },
      {
        id: 'p3-env-q3',
        topic_title: 'Eco-Tourism',
        question_text: 'How can tourism be managed sustainably without harming natural heritage sites?',
      },
    ],
  },
];
