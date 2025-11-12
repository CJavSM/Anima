graph TB
    subgraph "Cliente - Frontend"
        A[React Application]
        A1[Pages/Components]
        A2[Context API]
        A3[Services Layer]
        
        A --> A1
        A --> A2
        A --> A3
    end
    
    subgraph "Servidor - Backend FastAPI"
        B[API Routes]
        C[Controllers]
        D[Services]
        E[Models/ORM]
        F[Middlewares]
        
        B --> C
        C --> D
        D --> E
        F -.-> B
    end
    
    subgraph "Servicios Externos"
        G[(PostgreSQL)]
        H[AWS Rekognition]
        I[Spotify API]
        J[SMTP Gmail]
    end
    
    A3 -->|HTTP/REST| B
    E -->|SQLAlchemy| G
    D -->|boto3| H
    D -->|spotipy| I
    D -->|smtplib| J
    
    style A fill:#61dafb,stroke:#333,stroke-width:2px
    style B fill:#009688,stroke:#333,stroke-width:2px
    style G fill:#336791,stroke:#333,stroke-width:2px
    style H fill:#ff9900,stroke:#333,stroke-width:2px
    style I fill:#1db954,stroke:#333,stroke-width:2px