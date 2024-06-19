import item from "../models/item"
import cron from 'node-cron'



async function dick() {
    try{
        await new Promise(f => setTimeout(f, 5000));


        const response = await fetch('https://api.rolimons.com/items/v1/itemdetails')
        const convertedResponse = await response.json()
        if (convertedResponse.success == false) {
            return console.log('Item Update Failed')
        }
    
        let data = Object.entries(convertedResponse.items)
        let newArrayItems = []
    
        for (const i of data) {
            const newItem = {
                itemId: i[0],
                itemName: (i[1] as any)[0] as string,
                value: (i[1] as any)[4] as number
            }
    
            newArrayItems.push(newItem)
        }
    
        await item.deleteMany({})
        await item.insertMany(newArrayItems)
        console.log('Updated Items')
    }catch(err){
        console.log("failed")
    }
    
};

export default dick;