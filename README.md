Gaps:

No way for event submitters to edit or follow up on their submission (eg what if there's a time or room change?)
No way for admins (or normal peeps) to cancel events (it should show cancelled instead of deleted so peeps know)

No email notifications — admins won't know when something is pending approval unless they log in and check
Mobile navbar — it'll break on small screens with all those buttons in a row

IDEAS:

make it so today button also selects today

in the log in page, if people arent admins/etc maybe they could request to be an admin (providing an email and password)
also clarify that only admins can log in so peeps arent wondering why there isnt a sign up button

need to do another bug check

file refactoring? files are a bit messy right now, could do with some more folders

make it so admins see a delete button next to the edit button when viewing events. right now can't even delete events lol.

email announcements?

integrate with socials!!

add a page only visible to admins,
and on this page people can put comments on it, or suggestions or report bugs etc. next to each entry is a resolved tick button which deletes the entry.

when adding events:
- when their event is approved, they receive an email if they've put one in
- optionally add an image (but think db memory)

event queue for admins:
- when an event is approved, also publish that event to socials? or email announcements?
- different types of admin requests - "New recurring event request", "Cancel Event Request", "Event edit Request"

add boolean - BSL delivered or BSL interpreted

in the event details view; change the in person / online to just show the location if its in person, or just "online"

add predetermined events eg easter sunday, christmas day

for category colours,
ensure that the light colours have black text and vice versa

when you filter you can filter by event by range, region, etc

tag/# 

rename startsAt to be "from" and finishes At to be "to"

need better filtering/search options

must have a region selected?

COLOUR : light MODE
blue: #0178D4 
white background (cards)
grey: #ececec

COLOUR : dark MODE
black: #202020


accessibility section with drop downs

event age min and max optional
maybe click on toddlers, children, youth, adult, family, etc

have different ways of viewing calendar

make it phone-screen friendly! 

means can filter for city/region etc

rn set for only edinburgh (block non EH postcodes) but they can request to add their region (and be an admin - admins should be per region not for whole website)

add admin view; can see who are the other admins and for which region are they in charge of


ai summariser of info from website url (move it to the top)

add info abt the whastapp to the contact info page


once domain is sorted, i need to add the domain to these places:
- cloudflare turnstile allowed urls
- supabase redirected urls allowed
