import { Validator } from "./validation/Validator";

const validator = new Validator();

console.log(
    validator.validateRequired(
        "Hello",
        "story"
    )
);

console.log(
    validator.validateRequired(
        "",
        "story"
    )
);