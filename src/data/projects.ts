export interface ProjectDetail {
  year: string;
  location: string;
  client: string;
  mandataire: string;
  partners?: string;
  team?: string;
  program: string;
  area: string;
  cost: string;
  mission: string;
  status: string;
  photographer: string;
}

export type GalleryItem = 
  | { type: 'image'; id: string; src: string; width: number; height: number; alt: string; visibility?: 'public' | 'team' | 'private' }
  | { type: 'text'; id: string; content: string; style?: { fontSize?: string; textAlign?: string; backgroundColor?: string; color?: string }; visibility?: 'public' | 'team' | 'private' };

export interface Project {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  link: string;
  details?: ProjectDetail;
  galleryImages?: GalleryItem[];
  isVisible?: 'public' | 'team' | 'private' | boolean; // Allow boolean for backward compatibility but prefer string
  cardWidth?: number;
  cardHeight?: number;
  lockedAspectRatio?: boolean;
}

export const projects: Project[] = [
  {
    id: "320",
    title: "ADIDAS Arena",
    slug: "adidas-arena",
    imageUrl: "https://placehold.co/600x400?text=ADIDAS+Arena",
    link: "/projet/adidas-arena",
  },
  {
    id: "257",
    title: "IMVT",
    slug: "257-imvt",
    imageUrl: "https://placehold.co/600x800?text=IMVT",
    link: "/projet/257-imvt",
    details: {
      year: "2017",
      location: "Marseille",
      client: "OPPIC",
      mandataire: "NP2F",
      partners: "Marion Bernard, Point Supreme, Jacques Lucan",
      team: "Atelier Roberta, DVVD, Alto ingénierie, VPEAS, Peutz, 8-18",
      program: "Construction de l'Institut Méditerranéen de la Ville et des Territoires",
      area: "12 500 m² (+ 8 500 m² d'espaces extérieurs)",
      cost: "26 000 000",
      mission: "Complète",
      status: "livré en 2023",
      photographer: "@Maxime Delvaux, @Antoine Espinasseau",
    },
    galleryImages: Array.from({ length: 34 }, (_, i) => {
      // Simulate different aspect ratios
      const width = 1200;
      const height = i % 3 === 0 ? 1600 : i % 2 === 0 ? 800 : 1200; // Portrait, Landscape, Square mix
      return {
        type: 'image',
        id: `imvt-img-${i}`,
        src: `https://placehold.co/${width}x${height}?text=IMVT+${i + 1}`,
        width,
        height,
        alt: `IMVT View ${i + 1}`,
      };
    }),
  },
  {
    id: "223",
    title: "Cathédrale des sports",
    slug: "cathedrale-des-sports-2",
    imageUrl: "https://placehold.co/600x400?text=Cathedrale",
    link: "/projet/cathedrale-des-sports-2",
  },
  {
    id: "409",
    title: "FIRA Barcelona",
    slug: "fira-barcelona",
    imageUrl: "https://placehold.co/800x600?text=FIRA",
    link: "/projet/fira-barcelona",
  },
  {
    id: "388",
    title: "Centre sportif Victoria",
    slug: "centre-sportif-victoria",
    imageUrl: "https://placehold.co/600x400?text=Victoria",
    link: "/projet/centre-sportif-victoria",
  },
  {
    id: "404",
    title: "Complexe sportif",
    slug: "complexe-sportif",
    imageUrl: "https://placehold.co/600x400?text=Complexe",
    link: "/projet/complexe-sportif",
  },
  {
    id: "402",
    title: "Logements / Parking",
    slug: "logements-zac-littorale",
    imageUrl: "https://placehold.co/600x500?text=Logements",
    link: "/projet/logements-zac-littorale",
  },
  {
    id: "398",
    title: "Groupe scolaire",
    slug: "groupe-scolaire",
    imageUrl: "https://placehold.co/600x400?text=Ecole",
    link: "/projet/groupe-scolaire",
  },
  {
    id: "393",
    title: "Stade Union Saint-Gilloise",
    slug: "stade-union-saint-gilloise",
    imageUrl: "https://placehold.co/600x400?text=Stade",
    link: "/projet/stade-union-saint-gilloise",
  },
  {
    id: "390",
    title: "Hôpital Gustave Roussy",
    slug: "nouveau-centre-de-recherche-hopital-gustave-roussy",
    imageUrl: "https://placehold.co/600x400?text=Hopital",
    link: "/projet/nouveau-centre-de-recherche-hopital-gustave-roussy",
  },
  {
    id: "367",
    title: "Centre de Basket / Bureaux",
    slug: "centre-de-basket-bureaux",
    imageUrl: "https://placehold.co/600x400?text=Basket",
    link: "/projet/centre-de-basket-bureaux",
  },
  {
    id: "352",
    title: "Salle d’armes et dojo",
    slug: "centre-sportif-blr",
    imageUrl: "https://placehold.co/600x400?text=Dojo",
    link: "/projet/centre-sportif-blr",
  },
];
