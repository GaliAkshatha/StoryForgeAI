import { StoryRequirements } from "./StoryRequirements";
import { StoryPlan } from "./StoryPlan";
import { ResearchPackage } from "./ResearchPackage";
import { StoryDraft } from "./StoryDraft";
import { StoryCritique } from "./StoryCritique";

export interface WorkflowContext {

    requirements: StoryRequirements;

    plan: StoryPlan;

    research: ResearchPackage;

    draftStory?: StoryDraft;

    critique?: StoryCritique;

    finalStory?: StoryDraft;

}