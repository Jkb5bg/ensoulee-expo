export default interface DemographicsQuestionType {
    id: number;
    question: string;
    options: { key: string; value: string }[];
}