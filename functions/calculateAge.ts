export default function calculateAge(birthDate: string) {
    // Takes in the birtdate of the user and calculates their numeric age.
    if (!birthDate) return 0;

    try {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    } catch (error) {
        console.error("Error calculating age:", error);
        return 0;
    }
}