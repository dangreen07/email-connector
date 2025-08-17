import "isomorphic-fetch";
import { Client } from "@microsoft/microsoft-graph-client";

export function getGraphClient(accessToken: string) {
    return Client.init({
        authProvider: (done) => {
            done(null, accessToken); // pass the token to Graph SDK
        },
    });
}