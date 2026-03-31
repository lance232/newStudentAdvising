
  # Student Advising Program UI

  This is a code bundle for Student Advising Program UI. The original project is available at https://www.figma.com/design/9xmV42vRea6TaeugfS9bz1/Student-Advising-Program-UI.

  ## Running the code

  Run `npm i` to install the dependencies.

  Create a `.env` file in the project root and set your backend URL:

  `VITE_API_BASE_URL=https://localhost:53005/api`

  The login page now sends requests to:

  `POST {VITE_API_BASE_URL}/auth/login`

  First login password setup sends requests to:

  `POST {VITE_API_BASE_URL}/auth/first-login/start`

  `POST {VITE_API_BASE_URL}/auth/first-login/set-password`

  Admin user management page sends requests to:

  `GET {VITE_API_BASE_URL}/admin/users`

  `POST {VITE_API_BASE_URL}/admin/users`

  `PUT {VITE_API_BASE_URL}/admin/users/{id}/role`

  `DELETE {VITE_API_BASE_URL}/admin/users/{id}`

  Endpoint test order:

  1. `POST /auth/first-login/start`
  2. `POST /auth/first-login/set-password`
  3. `POST /auth/login`

  Use JWT token in protected requests:

  `Authorization: Bearer <token>`

  Account model used by frontend:

  1. Admin pre-registers users with official ID as username and assigned role
  2. User performs first login setup to create password
  3. User signs in normally afterward via `/api/auth/login`

  Request body used by frontend:

  `{ "username": "admin", "password": "admin123" }`

  Run `npm run dev` to start the development server.
  