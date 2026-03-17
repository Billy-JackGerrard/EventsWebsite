Gaps:

No way for event submitters to edit or follow up on their submission (eg what if there's a time or room change?)
No way for admins (or normal peeps) to cancel events (it should show cancelled instead of deleted so peeps know)

No email notifications — admins won't know when something is pending approval unless they log in and check
Mobile navbar — it'll break on small screens with all those buttons in a row

IDEAS:

in the log in page, if people arent admins/etc maybe they could request to be an admin (providing an email and password)
also clarify that only admins can log in so peeps arent wondering why there isnt a sign up button

need to do another bug check

file refactoring? files are a bit messy right now, could do with some more folders

make it so admins see a delete button next to the edit button when viewing events. right now can't even delete events lol.

email announcements?

integrate with socials!!

add a page only visible to admins,
and on this page people can put comments on it, or suggestions or report bugs etc. next to each entry is a resolved tick button which deletes the entry.
you could also read messages from the contact us page

when adding events:
- when their event is approved, they receive an email if they've put one in
- optionally add an image (but think db memory)

event queue for admins:
- when an event is approved, also publish that event to socials? or email announcements?
- different types of admin requests - "New recurring event request", "Cancel Event Request", "Event edit Request"

add predetermined events eg easter sunday, christmas day
maybe have this a kind of special event / non real event as it doesnt require a location or booking info etc

for category colours,
ensure that the light colours have black text and vice versa

when you filter you can filter by event by range, region, etc


rename startsAt to be "from" and finishes At to be "to"

need better filtering/search options

must have a region selected?


accessibility review - send directly to their email


have different ways of viewing calendar

people can click I'm going to a certain event - maybe need to wait until after user accounts are set up

Set Up Multiple Views: Provide options for list, grid, or monthly views to cater to different user preferences.
Also setup a Map View to see where events are this month, maybe with a number with each pin to show how many events are there

means can filter for city/region etc

rn set for only edinburgh (block non EH postcodes) but they can request to add their region (and be an admin - admins should be per region not for whole website)

add admin view; can see who are the other admins and for which region are they in charge of


ai summariser of info from website url

scrape data for events.
eg theatre websites for their bsl interpreted event info

maybe in admin view, get rid of contact view, and replace it with messages view which shows admins the messages from people who have filled in the contact view - and admins can add their own message in there 


add info abt the whastapp to the contact info page


once domain is sorted, i need to add the domain to these places:
- cloudflare turnstile allowed urls
- supabase redirected urls allowed
