import { Adventure } from "../models/Adventure";

export interface AdventureRepository {

    findById(
        id: string
    ): Promise<Adventure | undefined>;

    findByChildId(
        childId: string
    ): Promise<Adventure[]>;

    save(
        adventure: Adventure
    ): Promise<void>;

}
