import type {ParsedItem} from "@/app/types/item";

export const parseItemText = (text: string): ParsedItem => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    let itemClass: string | undefined;
    let itemLevel: number | undefined;
    const stats: string[] = [];
    let rarity: string | undefined;
    let name: string | undefined;
    let baseType: string | undefined;
    let foundItemLevel = false;
    let foundStats = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('Item Class:')) {
            itemClass = line.replace('Item Class:', '').trim();
        } else if (line.startsWith('Item Level:')) {
            const match = line.match(/Item Level: (\d+)/);
            if (match) {
                itemLevel = parseInt(match[1]);
                foundItemLevel = true;
            }
        } else if (line.startsWith('Rarity:')) {
            rarity = line.replace('Rarity:', '').trim();
            if (rarity === 'Unique' && i + 2 < lines.length) {
                name = lines[i + 1].trim();
                baseType = lines[i + 2].trim();
            }
        } else if (foundItemLevel && !foundStats) {
            if (line.includes('--------')) {
                foundStats = true;
            }
        } else if (foundStats && !line.includes('--------')) {
            if (line.match(/[0-9]+/) ||
                line.includes('to ') ||
                line.includes('increased ') ||
                line.includes('reduced ') ||
                line.includes('Recover')) {
                stats.push(line);
            }
        }
    }

    return {itemClass, itemLevel, stats, rarity, name, baseType};
};