// types/quizDataType.ts
export default interface QuizQuestion {
    questionNumber?: string;
    question: string;
    Answer1?: string;
    Answer2?: string;
    Answer3?: string;
    Answer4?: string;
}

export type QuizDataType = QuizQuestion[];