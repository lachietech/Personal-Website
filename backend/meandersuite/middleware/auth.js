export function isAuthenticated(req, res, next) {
    if (req.session.logged_in && req.session.app === 'meandersuite') {
        next();
    } else {
        res.redirect('/meandersuite/login');
    }
}
