import {Bool} from "z3-solver";

export interface Constraint {
    label: string;
    expr: Bool
}

export abstract class UniqueConstraint {
    static generateRandomString(length?: number): string {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "-"
        let len
        if (length) {
            len = length
        } else {
            len = 5
        }
        for (let i = 0; i < len; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            result += characters[randomIndex]
        }
        return result
    }
}

