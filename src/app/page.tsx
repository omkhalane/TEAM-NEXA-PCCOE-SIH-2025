'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  LocateIcon,
  MapIcon,
  ServerIcon,
  ZapIcon,
  History,
  Bot,
  LineChart,
  Waypoints,
  AlertTriangle,
} from 'lucide-react';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { Autocomplete, type Suggestion } from '@/components/ui/autocomplete';
import { DssShowcase } from '@/components/dss-showcase';

const faqs = [
  {
    question: 'How accurate is the live train tracking?',
    answer:
      'Our platform uses real-time data from official railway sources, providing high accuracy for train locations, delays, and arrival times. Updates are typically refreshed every 30-60 seconds.',
  },
  {
    question: 'What is the Decision Support System (DSS)?',
    answer:
      'The DSS is an advanced feature that uses AI to analyze the entire rail corridor. It provides real-time recommendations to optimize train flow, minimize delays, and improve network efficiency. Controllers can view and act on these suggestions.',
  },
  {
    question: 'Can I use this service on my mobile device?',
    answer:
      'Yes, our website is fully responsive and works seamlessly on all devices, including desktops, tablets, and smartphones. You can track trains on the go without needing a separate app.',
  },
  {
    question: 'Is this service free to use?',
    answer:
      'Absolutely. All features on our platform, including live tracking, station boards, and train schedules, are completely free for all users. We are committed to providing accessible train information.',
  },
];

const features = [
  {
    icon: <ZapIcon className="h-8 w-8 text-primary" />,
    title: 'Real-Time Train Status',
    description:
      'Track any train across the country with live location, speed, and delay updates every 30 seconds.',
  },
  {
    icon: <MapIcon className="h-8 w-8 text-primary" />,
    title: 'Interactive Live Map',
    description:
      'Visualize the entire rail network, view all active trains, and explore specific train routes overlaid on the map.',
  },
  {
    icon: <Bot className="h-8 w-8 text-primary" />,
    title: 'AI-Powered Decision Support',
    description:
      'Leverage our advanced DSS for optimized routing, conflict resolution, and delay reduction on key corridors.',
  },
];

interface RecentSearch {
    type: 'between' | 'live';
    label: string;
    url: string;
}

function HomePageContent() {
  const router = useRouter();
  const [fromStation, setFromStation] = React.useState<Suggestion | null>(null);
  const [toStation, setToStation] = React.useState<Suggestion | null>(null);
  const [train, setTrain] = React.useState<Suggestion | null>(null);
  const [journeyDate, setJourneyDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [recentSearches, setRecentSearches] = React.useState<RecentSearch[]>([]);

  React.useEffect(() => {
    try {
        const storedSearches = localStorage.getItem('recentSearches');
        if (storedSearches) {
            setRecentSearches(JSON.parse(storedSearches));
        }
    } catch (e) {
        console.error("Could not parse recent searches from localStorage", e)
    }
  }, []);

  const addRecentSearch = (search: RecentSearch) => {
    try {
        const updatedSearches = [search, ...recentSearches.filter(rs => rs.url !== search.url)].slice(0, 5);
        setRecentSearches(updatedSearches);
        localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
    } catch(e) {
        console.error("Could not save recent searches to localStorage", e);
    }
  }

  const handleFindTrains = () => {
    if (fromStation && toStation) {
      const url = `/between-stations?from=${fromStation.value}&to=${toStation.value}`;
      addRecentSearch({
        type: 'between',
        label: `${fromStation.value} to ${toStation.value}`,
        url: url
      });
      router.push(url);
    }
  };
  
  const handleSearchTrain = () => {
    if (train && journeyDate) {
      const url = `/live-status?trainNo=${train.value}&date=${journeyDate}`;
      addRecentSearch({
        type: 'live',
        label: `${train.value} - ${train.label.split(' - ')[1]}`,
        url: url
      });
      router.push(url);
    }
  }
  
  const handleRecentSearchClick = (url: string) => {
    router.push(url);
  }


  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-secondary/50 py-16 sm:py-24">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              The Future of Rail Operations is Here
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground">
              RailPulse combines nationwide live train tracking with a powerful AI-driven Decision Support System (DSS) to create the most advanced rail management platform in India.
            </p>
            <div className="mt-12 flex flex-wrap justify-center gap-4">
              <Button size="lg" variant="default" onClick={() => router.push('/dss-corridor')}>
                <Bot className="mr-2 h-5 w-5" />
                Launch DSS Cockpit
              </Button>
               <Button size="lg" variant="outline" onClick={() => router.push('/live-map')}>
                <MapIcon className="mr-2 h-5 w-5" />
                View Live Map
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto -mt-10 px-4 md:-mt-16">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Trains Between Stations</CardTitle>
                <CardDescription>
                  Find all available trains between two stations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Autocomplete
                    type="stations"
                    placeholder="From Station"
                    onSelect={setFromStation}
                />
                <Autocomplete
                    type="stations"
                    placeholder="To Station"
                    onSelect={setToStation}
                />
                <Button className="w-full" onClick={handleFindTrains} disabled={!fromStation || !toStation}>Find Trains</Button>
                <p className="text-xs text-muted-foreground">
                  Enter station name or code (e.g., NDLS or New Delhi).
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Where is My Train?</CardTitle>
                <CardDescription>
                  Get the live status of any train.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <Autocomplete
                    type="trains"
                    placeholder="Enter train number or name"
                    onSelect={setTrain}
                />
                <Input type="date" placeholder="Journey Date" value={journeyDate} onChange={(e) => setJourneyDate(e.target.value)} />
                <Button className="w-full" onClick={handleSearchTrain} disabled={!train || !journeyDate}>Search Train</Button>
                <p className="text-xs text-muted-foreground">
                  Select the date the train started its journey.
                </p>
              </CardContent>
            </Card>
          </div>
          {recentSearches.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><History size={20}/> Recent Searches</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-primary">
                  {recentSearches.map((search, index) => (
                    <li key={index}>
                      <button onClick={() => handleRecentSearchClick(search.url)} className="hover:underline text-left">
                        {search.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="bg-background py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Powered by an AI Decision Support System
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Our DSS is the brain behind RailPulse, analyzing vast amounts of
                data to provide actionable intelligence for traffic controllers.
              </p>
            </div>
            <div className="mt-12">
              <DssShowcase />
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex flex-col items-center text-center">
                <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                <h3 className="font-semibold">Conflict Detection</h3>
                <p className="text-sm text-muted-foreground">
                  Proactively identifies potential scheduling conflicts for
                  platforms, tracks, and yards before they cause delays.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <Waypoints className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">Smart Routing</h3>
                <p className="text-sm text-muted-foreground">
                  Generates optimal routing and holding recommendations to
                  minimize passenger impact and maintain schedules.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <LineChart className="h-10 w-10 text-accent mb-3" />
                <h3 className="font-semibold">KPI Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  Tracks key performance indicators like on-time percentage,
                  average delay, and corridor throughput in real-time.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <ZapIcon className="h-10 w-10 text-green-500 mb-3" />
                <h3 className="font-semibold">Increased Efficiency</h3>
                <p className="text-sm text-muted-foreground">
                  Improves overall network fluidity, reduces operational costs,
                  and enhances safety across the corridor.
                </p>
              </div>
            </div>
            <div className="text-center mt-12">
              <Button onClick={() => router.push('/dss-corridor')}>
                Explore the DSS Cockpit
              </Button>
            </div>
          </div>
        </section>


        <section className="bg-secondary/50 py-16 sm:py-24">
          <div className="container mx-auto max-w-4xl px-4">
            <h2 className="text-center text-3xl font-bold">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="mt-8 w-full">
              {faqs.map((faq, i) => (
                <AccordionItem value={`item-${i}`} key={i}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}


export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading...</div>}>
      <HomePageContent />
    </Suspense>
  )
}
