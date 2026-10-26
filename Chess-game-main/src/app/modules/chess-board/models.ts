import { FENChar } from "../../chess-logic/models";


export type SelectedSquare =
{
    piece: FENChar;
    x: number;
    y: number;
}
|
{
    piece: null;
};


export const columns = [
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h"
] as const;