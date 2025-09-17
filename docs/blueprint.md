# **App Name**: RailPulse

## Core Features:

- Real-Time Train Tracking: Monitor train locations and statuses on the New Delhi to Agra corridor in real time using data from RailRadar API.
- Delay Detection: Automatically identify trains experiencing significant delays based on predefined thresholds.
- AI-Powered Rescheduling: Utilize an A* search algorithm to calculate optimal rescheduling plans to minimize the impact of delays; the LLM can be used as a tool to suggest appropriate values to fine tune the algorithm
- Corridor Visualization: Provide a visual representation of the train's journey on a map using train icon components and proportional spacing.
- Interactive Control Panel: Allow users to trigger optimization routines and view current corridor status.
- Action Recommendations Display: Clearly display recommended actions (e.g., hold train, adjust speed) for each train via a pop-up modal.
- API Integration and Caching: Efficiently retrieve train information from the RailRadar API, with aggressive caching (24 hours for static data and 60 seconds for dynamic), to respect API usage limits and reduce latency.

## Style Guidelines:

- Primary color: Indigo (#4F46E5), offering a blend of calm and technological sophistication.
- Background color: Very light indigo (#F5F3FF) to provide a muted backdrop.
- Accent color: Violet (#8B5CF6) to highlight interactive elements.
- Font: 'Inter', a grotesque-style sans-serif font to be used for both headlines and body text.
- Use clear, modern train icons to represent trains on the map. Highlight delayed trains with a distinct color or visual cue.
- Use a clean, map-based layout to display the train corridor and provide an intuitive overview of the rail network. Modals must be used to show recommendations.
- Incorporate subtle animations for train movements and status updates to provide real-time feedback.