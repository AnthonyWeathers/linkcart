# ProductPals

The app is a versatile platform enabling users to save, organize, and interact with products. Users can log in, add products to their saved list, edit product details, sort and filter saved products, and mark favorites. Social features include managing friend lists, sending friend requests, and participating in a community messaging space. With the planned online/offline toggle feature, users can focus solely on product-related functionality in offline mode, hiding social features for a streamlined experience.

## Technologies Used:

* React/Javascript (front-end)
* Python (back-end)
* Flask
* HTML, CSS
* postgresSQL
* WebSocket

## Features:
* Login:
    * Requires a username and password that has been registered into the database
    * Links for user if they forgot their username or password
    
* Register:
    * Requires a username and password before clicking register button
    * Needs a unique username that has not already been used, otherwise gives alert of “user already exists”

* Forgot Username
    * Requires user email to send a reminder of their username
    * Has button to resend email if not received

* Forgot Password
    * Requires username and email of account to send a reset code to email
    * New form requires the code sent to email, and the new password
        * Has resend code button incase first email was not received, goes back to first form so user re-enters username and email

* Main Page:
No main page but a consistent two navbars at top and bottom of the app page. The navbars keep links to subsequent features displayed.

    * Add Product:
        * Users can enter the url of a product, its price, and name of the product to better clarify the product for themselves
            * Categories are shown in a list and users can select one or as many as fits the product (ctrl+click)
        * After entering product info, users see buttons to re-edit the info incase of a mistake, delete the info, or save the product
        * Products are saved to the database and displayed in the Saved Products view.
    
    * Product List:
        * Has all of the products the user saved, favorited products are displayed first
        * Can edit or delete the info of a saved product, or can favorite/unfavorite a product
        * Has sorting:
            * By price, ascending or descending order, with additional filtering by a price range
            * By category, select list where user can pick one or many categories that products will be filtered by
            * By favorited status, where favorited products will be displayed first
    
    * Profile:
        * Displays username, user's description/bio, and their favorited products
        * Users can edit/update their description
        * Users can delete their account
            * Other users trying to view a deleted profile will see the deleted user page
        * If viewing profile of another user
            * User can send a friend request
            * If other user had sent current user a friend request, the current user can accept or decline it
            * If already friends, then current user sees a button to remove friend
        

    * Friends:
        * View pending friend requests and accept/decline them.
        * See a list of all current friends.
        * Links to user profiles are provided for friends and requesters.

    * Community:
        * Engage with the community via a real-time chat feature powered by socket.io.
        * Messages include the sender's username and a timestamp.
            * Can go to profiles of other users through their username
            * Deleted users that have messages will have their usernames be changed to User Deleted to signify that account was deleted
        * Upon loading the page, only displays the 30 most recent messages + new messages during viewing until reload

* Online/Offline Mode
    * A checkbox for users to switch between "Online" and "Offline" modes.
    * Online Mode: Access full features, including friends, profiles, and community.
    * Offline Mode: Simplifies the interface for product-related functionality only.