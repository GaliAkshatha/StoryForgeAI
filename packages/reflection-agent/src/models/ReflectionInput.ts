export interface ReflectionInput {

    childName: string;

    ageRange: string;

    // What situation the child faced.
    situation: string;

    // The decision the child made.
    decisionText: string;

    // The narrative consequence produced by the Consequence Engine.
    consequenceNarrative: string;

    // The learning moral/theme of the current adventure.
    moral: string;

}
