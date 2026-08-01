// Section G: replaces the hardcoded "always 4" with a small
// deterministic policy. Product target is 2-3 meaningful choices;
// 4 was producing generic/weak options merely to hit a fixed width.
//
// This policy NEVER increases the count beyond how many candidates
// actually survived ConstraintEngine -- it only caps the upper end.
// Fewer than MIN is allowed exactly when constraints genuinely left
// fewer valid candidates (the caller is responsible for not padding
// with rejected ones; this class has no visibility into rejected
// candidates at all, by design, so it cannot resurrect them).
export class ChoiceCountPolicy {

    static readonly MIN = 2;

    static readonly NORMAL_MAX = 3;

    determine(
        validCandidateCount: number
    ): number {

        if (validCandidateCount <= ChoiceCountPolicy.MIN) {
            return validCandidateCount;
        }

        return Math.min(validCandidateCount, ChoiceCountPolicy.NORMAL_MAX);

    }

}
