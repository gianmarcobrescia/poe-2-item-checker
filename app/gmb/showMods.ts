import {parseItemText} from "@/app/gmb/parseItem";

export function renderMods(text: string) {
    document.getElementById("itemMods").innerHTML = '';
    document.getElementById("itemsFromTrade").innerHTML = '';

    try {
        const parsedItem = parseItemText(text);

        // if (parsedItem.itemClass && !ITEM_CLASS_MAP[parsedItem.itemClass]) {
        //     setError(`Item type "${parsedItem.itemClass}" is not supported yet`);
        //     setLoading(false);
        //     return;
        // }

        const ul = document.getElementById('itemMods') as HTMLUListElement;
        ul.innerHTML = "";
        parsedItem.stats.forEach(stat => {
            const li = document.createElement('li');  // Create a new <li> element

            // Create a checkbox <input> element
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = stat;

            const label = document.createElement('label');
            label.textContent = " " + stat;
            label.style.cursor = 'pointer';
            label.setAttribute("for", stat);

            // const textNode = document.createTextNode(stat);

            li.appendChild(checkbox);
            li.appendChild(label);

            // Append the <li> to the <ul>
            ul.appendChild(li);
        });

    } catch (error) {
        // setError(error instanceof Error ? error.message : 'An error occurred');
        console.error('Search error:', error);
    }
}