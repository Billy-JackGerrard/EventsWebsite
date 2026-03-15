TODO ASAP:
finish convo with claude about approving recurring events, then copy those updated files
1. why are you approving all the events other than the first one? they havent been approved yet by the admin, what if they're spam?
2. do you think we should put the recurrence_id in the new db column - recurrence_summary json

Gaps:

No way for event submitters to edit or follow up on their submission (eg what if there's a time or room change?)
No way for admins (or normal peeps) to cancel events (it should show cancelled instead of deleted so peeps know)
No way for admins to edit an event before approving it (e.g. fix a typo)

No email notifications — admins won't know when something is pending approval unless they log in and check
Mobile navbar — it'll break on small screens with all those buttons in a row

Biweekly is not an option when adding recurring events.

IDEAS:

in the log in page, if people arent admins/etc maybe they could request to be an admin (providing an email and password)
also clarify that only admins can log in so peeps arent wondering why there isnt a sign up button

final bug checker

email announcements?

integrate with socials!!

when adding events:
- when their event is approved, they receive an email if they've put one in
- optionally add an image 

event queue for admins:
- add a "notification" mark when there are unapproved events in the queue
- when an event is approved, also publish that event to socials? or email announcements?
- different types of admin requests - "New recurring event request", "Cancel Event Request", "Event edit Request"


make it phone-screen friendly!



once domain is sorted, i need to add the domain to these places:
- cloudflare turnstile allowed urls
- supabase redirected urls allowed
