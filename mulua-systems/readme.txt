MIROX SHARED INSURANCE INVESTIGATION SYSTEM
============================================

WHAT THIS IS
------------
A beginner-friendly HTML, CSS and JavaScript web app using Supabase for shared online data and sign-in. It includes:
- Admin: register/edit/delete files, assign files, manage investigator profiles, view all expenses and reports.
- Investigator: sign in, view assigned files, add expenses to assigned OPEN files, and edit/delete expenses they entered.
- Reports: daily totals, totals per file, today's total and grand total.
- Shared data: authorized users can access the same online data from different computers.

IMPORTANT
---------
This starter project needs internet access and a Supabase project.
It is a starter template, not a fully audited production system. Before using real claim/customer information, have a developer review the database policies, account setup, backups, and deployment security.
Never put a Supabase service_role key in this website. Only use the anon/publishable key.

STEP 1: CREATE A SUPABASE PROJECT
---------------------------------
1. Go to https://supabase.com/ and create an account or sign in.
2. Create a new project and keep the database password somewhere safe.
3. Wait for the project to finish creating.

STEP 2: CREATE THE TABLES AND SECURITY RULES
--------------------------------------------
1. In your Supabase project, open SQL Editor.
2. Choose New query.
3. Open the file supabase_setup.sql from this folder.
4. Copy all of its contents into the SQL Editor.
5. Click Run. Confirm that it completes without errors.

STEP 3: CONNECT THE WEBSITE TO SUPABASE
---------------------------------------
1. In Supabase, open Project Settings -> API (or the project's API keys page).
2. Copy the Project URL.
3. Copy the anon/public/publishable key. Do NOT copy the service_role or secret key.
4. Open config.js in a text editor.
5. Replace PASTE_YOUR_SUPABASE_PROJECT_URL_HERE with the Project URL.
6. Replace PASTE_YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY_HERE with the anon/publishable key.
7. Save config.js.

STEP 4: CREATE THE FIRST ADMIN LOGIN
------------------------------------
The first admin profile must be made in two parts. This is deliberate: account creation must be done through Supabase Authentication, not by saving a password in this website.

A. Create the login:
1. In Supabase, open Authentication -> Users.
2. Choose Add user / Create new user.
3. Enter the administrator's email and a strong password.
4. Confirm/create the user as directed by Supabase.
5. Copy the user's UUID (ID) from the user details.

B. Give that login the admin role:
1. In Supabase, open SQL Editor and run the following, replacing the example values.
   Use a real UUID from Authentication -> Users. Use single quotes around names.

   INSERT INTO public.profiles (id, first_name, last_name, role)
   VALUES ('PASTE-USER-UUID-HERE', 'Admin', 'Name', 'admin');

2. Sign in to the website with that admin email and password.

STEP 5: CREATE INVESTIGATOR ACCOUNTS
------------------------------------
For every investigator:
1. In Supabase, open Authentication -> Users -> Add user / Create new user.
2. Enter the investigator's email and a temporary/strong password.
3. Copy the user's UUID.
4. Sign in to the website as admin.
5. Open Investigators.
6. Enter the UUID, first name, last name and role Investigator.
7. Click Save profile.
8. Give the investigator their login email and password securely. They should change their password through a secure process before real use. This starter does not yet include a password-reset screen.

STEP 6: OPEN THE WEBSITE
------------------------
For a quick local test:
1. Keep index.html, style.css, app.js and config.js in the same folder.
2. Open index.html in a modern browser.
3. If your browser blocks requests when opening files directly, run a simple local web server. For example, if Python is installed, open a terminal in the folder and run:
       python -m http.server 8000
   Then visit:
       http://localhost:8000

To allow staff on different computers to use it, publish the folder to a static hosting service such as Netlify, Vercel, or another HTTPS web host. All computers should use the same published website URL. The Supabase database is shared online.

BASIC WORKFLOW
--------------
1. Admin signs in.
2. Admin registers files.
3. Admin creates investigator login accounts in Supabase Authentication and adds their profiles in the website.
4. Admin assigns files to investigators.
5. Investigators sign in and view their assigned files.
6. Investigators record expenses against assigned open files.
7. Admin reviews daily totals, file totals and the grand total.
8. Admin closes a file by editing its status to Closed. Investigators can no longer add new expenses to a closed file.

TROUBLESHOOTING
---------------
- "Invalid API key" or connection errors: check config.js and ensure you used the project URL and anon/publishable key.
- "Could not load your profile": the signed-in user's UUID must have a matching row in public.profiles.
- Cannot create/edit/delete records: check that supabase_setup.sql ran successfully and that you are signed in as an admin.
- File doesn't appear for investigator: confirm the admin assigned it to that investigator and the file is open.
- If the SQL script is run again, it recreates the policies; it does not erase table data.

LIMITATIONS / NEXT IMPROVEMENTS
------------------------------
This is a learning starter. It currently lets investigators see expense records for files assigned to them, but the app report screens are simple. Before production use, consider adding password reset, stronger audit history, export to Excel/PDF, backups, and a developer security review. Test using dummy data first.
