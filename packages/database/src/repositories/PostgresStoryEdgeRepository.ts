import { DerivedStoryEdgeRepository } from "@storyforge/story-graph";
import { PostgresStoryNodeRepository } from "./PostgresStoryNodeRepository";

// Edges are already stored as StoryChoice entries inside each node's
// JSON column (see PostgresStoryNodeRepository) -- this is
// DerivedStoryEdgeRepository (the same class the in-memory setup
// uses) constructed over the Postgres node repository, not a
// separate table or a second write path.
export class PostgresStoryEdgeRepository extends DerivedStoryEdgeRepository {

    constructor(
        nodeRepository: PostgresStoryNodeRepository
    ) {

        super(nodeRepository);

    }

}
