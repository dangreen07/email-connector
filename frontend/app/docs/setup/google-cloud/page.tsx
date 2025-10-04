"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

/**
 * Google Cloud setup guide (markdown).
 * This guide explains how customers should configure Google Cloud
 * so that our service can act on behalf of their company (OAuth / domain-wide delegation).
 */
export default function GoogleCloudSetup() {
  const md = `## Google Docs

To start setting up your google cloud console for production with MailLink.

Navigate to https://console.cloud.google.com/ and create a new project, call it anything you want (your company name is probably a good idea)

![image.png](/google-docs/image1.png)

Then go to the sidebar and click on the 3 horizontal lines to open the side bar, and navigate to the Enabled APIs & services page by clicking on the button. Once there you need to press the “Enable APIs and services” button

![image.png](/google-docs/image2.png)

You should get to a page that looks a bit like this

![image.png](/google-docs/image3.png)

Once here, search for gmail in the search box and hit enter, then click the Gmail API option from the results

![image.png](/google-docs/image4.png)

Then click the “Enable” button, and wait for google to do its thing for a second.

![image.png](/google-docs/image5.png)

Then click the back button, and once again press the “Enable APIs and services” button

![image.png](/google-docs/image6.png)

![image.png](/google-docs/image7.png)

This time, search for “pubsub” and hit enter. Then select the option titled “Cloud Pub/Sub API” (not the lite version)

![image.png](/google-docs/image8.png)

And enable it if it looks like the image, if there is a Manage button there instead then just skip this step.

![image.png](/google-docs/image9.png)

Then go back to the Enabled APIs and services page, which can be done with the back arrow.

Then navigate to the Credentials page

![image.png](/google-docs/image10.png)

Click the “Create Credentials” button and then press the “Oauth client ID” button

![image.png](/google-docs/image11.png)

On the page you were redirected to, select Web Application

![image.png](/google-docs/image12.png)

Leave the name as is, or change it (It is only for internal use). Then add your websites URL to the authorized javascript origins

![image.png](/google-docs/image13.png)

For the authorized redirect URI's. You just need to go to your MailLink dashboard where you should have enabled gmail in your production environment, and there will be the URI you need to add, ready to copy.

![image.png](/google-docs/image14.png)

So copy that and put it in the authorized redirect URI section

![image.png](/google-docs/image15.png)

Once you've done this, press the Create button at the bottom of the page, a popup should appear with the client id, copy this and paste it into the client id field on the MailLink dashboard

Once you've done that and clicked OK on the popup box you should be taken to a page like this (I just created Web client 2, yours will be called whatever you named it)

![image.png](/google-docs/image16.png)

Now click on your newly created Oauth 2 client (Mines called Web client 2) and you should get a screen similar to this (I've redacted some data from the image)

![Screenshot 2025-10-04 155149.png](/google-docs/image17.png)

In the bottom right you can see the client secret, click the copy button and then paste it into your MailLink dashboard where it says Client Secret. 

Now go back to the google dashboard and type “pubsub” in the search bar at the top, then click on the top result “Pub/Sub”.

![image.png](/google-docs/image18.png)

On this page, click the “Create topic” button

![image.png](/google-docs/image19.png)

Then name it something such as “gmail-notify” and click create

![image.png](/google-docs/image20.png)

Now on the new page you've been brought to copy the topic name, and paste it into the MailLink dashboard's “Topic Name” field.

![image.png](/google-docs/image21.png)

Now all you need to do is click add principal on the right of the google dashboard, then give it a principal of “gmail-api-push@system.gserviceaccount.com” and set the Role to Pub/Sub Admin, then hit Save.

![image.png](/google-docs/image22.png)

Now go to your MailLink dashboard and make sure you press the “Save Changes” button. Once you've done that, gmail connections will work in your production environment.`;

  return (
    <div className="mx-auto max-w-screen-md px-4 py-12">
      <div className="mb-4 text-sm">
        <Link href="/docs/setup" className="text-sm text-primary underline">
          ← Back to Setup docs
        </Link>
      </div>

      <article className="prose prose-lg dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
      </article>
    </div>
  );
}
