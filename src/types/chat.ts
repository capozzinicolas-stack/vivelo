export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  serviceCards?: ChatServiceCard[];
  isLoading?: boolean;
  timestamp: string;
}

export interface ChatServiceCard {
  id: string;
  title: string;
  base_price: number;
  price_unit: string;
  category: string;
  avg_rating: number;
  review_count: number;
  zones: string[];
  image: string | null;
  provider_name: string | null;
}
