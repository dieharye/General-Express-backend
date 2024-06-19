import { AnyMap } from "../modules/special_types";

export function sortObject(obj: AnyMap) {
    return Object.keys(obj).sort().reduce(
        (result: AnyMap, key) => {
            result[key] = (obj[key] && typeof obj[key] === 'object') ? sortObject(obj[key]) : obj[key]
            return result
        },
        {}
    )
}

