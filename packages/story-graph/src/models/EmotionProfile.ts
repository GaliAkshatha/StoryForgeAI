// Each value is 0-1, how strongly this node carries that emotion.
// Multiple can be nonzero at once (a scene can be both exciting and
// a little frightening). Authored once per node at generation time;
// the Emotion Engine (a later phase) reads these to adapt future
// node selection/generation, e.g. dialing down difficulty when
// recent frustration has been high.
export interface EmotionProfile {

    excitement: number;

    curiosity: number;

    confidence: number;

    fear: number;

    wonder: number;

    frustration: number;

    pride: number;

    calm: number;

}

export function neutralEmotionProfile(): EmotionProfile {

    return {

        excitement: 0,

        curiosity: 0,

        confidence: 0,

        fear: 0,

        wonder: 0,

        frustration: 0,

        pride: 0,

        calm: 0

    };

}
