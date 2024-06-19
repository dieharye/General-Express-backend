import { AnyMap } from "./special_types"

export enum HeadshotSize {
    LARGEST = 720,     // 720x720
    SMALLEST = 48,     // 48x48
    NORMAL = 352,      // 352x352
};

export enum HeadshotFormat {
    PNG = 'Png',
    JPEG = 'Jpeg',
};

class RobloxAPI {
    async GetHeadshot(UserId: string | number, Size: HeadshotSize, Format: HeadshotFormat, IsCircular = false): Promise<string> {
        return new Promise((res, rej) => {
            fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${UserId}&size=${Size}x${Size}&format=${Format}&isCircular=${IsCircular}`)
                .then(res => res.json())
                .then(data => {
                    if (data.data && data.data.length > 0) {
                        res(data.data[0].imageUrl)
                    } else {
                        rej(data)
                    }
                })
                .catch(err => {
                    rej(err)
                })
        })
    }
};

const Roblox = new RobloxAPI();
export default Roblox