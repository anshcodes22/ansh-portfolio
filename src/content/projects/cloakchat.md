---
title: CloakChat
tagline: A privacy-focused real-time chat platform with ephemeral, self-destructing communication rooms.
order: 1
image:
    file: ./images/cloakchat.png
    caption: Cloakchat project interface screenshot.
    width: 800
    height: 600

githubId: anshcodes22/CloakChat-mern-chat-app

links:
    - name: Website
      url: https://cloak-chat-mern-chat-app.vercel.app
      icon: fa7-solid:link

devicons:
    - nextjs
    - react
    - typescript
    - tailwindcss

customIcons:
    - name: Upstash
      url: https://upstash.com
      icon: /icons/upstash.svg
    - name: Elysia.js
      icon: /icons/elysia.svg
    - name: TanStack Query
      icon: /icons/tanstack.svg
    
---
CloakChat is a real-time chat application designed with a strong focus on privacy and temporary communication. Users can create private rooms accessible via unique shareable codes, enabling secure and isolated conversations. The system uses event-driven architecture with WebSockets to ensure low-latency messaging, while integrating Upstash for efficient state management and scalability. Each room has a defined lifecycle, automatically expiring after 10 minutes, with an option for manual deletion at any time. By avoiding persistent storage and enforcing automatic cleanup, the platform ensures that conversations remain transient and secure.
