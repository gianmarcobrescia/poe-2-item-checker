export interface FetchItem {
  listing: Listing;
  item: Item;
}

interface Listing {
  indexed: string;
  price: Price;

}

interface Price {
  amount: number;
  currency: string;
}

interface Item {
  baseType: string;
  ilvl: number;
}
