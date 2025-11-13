graph TB
    subgraph Cliente["Cliente - Frontend"]
        A[React Application]
        <!-- Project architecture diagram (Mermaid) -->

        ```mermaid
        graph TB
            subgraph Cliente["Cliente - Frontend"]
                A[React Application]
                A3[Services Layer]

               
                A --> A3
            end

            subgraph Servidor["Servidor - Backend (FastAPI)"]
                B[API Routes]
                C[Controllers]
                D[Services]
                E[Models / ORM]
                F[Middlewares]

                B --> C
                C --> D
                D --> E
                F -.-> B
            end

            subgraph Externos["Servicios Externos"]
                G[(PostgreSQL)]
                H[AWS Rekognition]
                I[Spotify API]
                J[SMTP / Email]
            end

            A3 -->|HTTP / REST| B
            E -->|SQLAlchemy| G
            D -->|boto3| H
            D -->|spotipy| I
            D -->|smtplib| J

            classDef frontend fill:#61dafb,stroke:#333,stroke-width:2px
            classDef backend fill:#009688,stroke:#333,stroke-width:2px
            classDef database fill:#336791,stroke:#333,stroke-width:2px
            classDef aws fill:#ff9900,stroke:#333,stroke-width:2px
            classDef spotify fill:#1db954,stroke:#333,stroke-width:2px

            class A frontend
            class B backend
            class G database
            class H aws
            class I spotify
        ```