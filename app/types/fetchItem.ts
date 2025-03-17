export interface FetchItem {
  listing: Listing;
}

interface Listing {
  indexed: string;
  price: Price;

}

interface Price {
  amount: number;
  currency: string;
}
