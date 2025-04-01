import MatchedUser from "./matchedUserType";
import MessagePreview from "./messagePreviewType";

export default interface Match {
    id: string;
    matchId: string;
    matchedUser: MatchedUser;
    matchRank?: string;
    matchScore?: number;
    status?: string;
    createdAt?: string;
    userName1?: string;
    userName2?: string;
    lastMessage: MessagePreview;
}