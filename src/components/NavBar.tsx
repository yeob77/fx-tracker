import { NavLink } from 'react-router-dom';
import { Navbar, Nav, Container, Button } from 'react-bootstrap'; // Import Button
import { useTheme } from '../contexts/ThemeContext'; // Import useTheme hook

const NavBar = () => {
  const { theme, toggleTheme } = useTheme(); // Use the theme context

  return (
    <Navbar bg={theme === 'dark' ? 'dark' : 'light'} variant={theme === 'dark' ? 'dark' : 'light'} expand="lg">
      <Container fluid>
        <Navbar.Brand as={NavLink} to="/">FX-Tracker</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={NavLink} to="/usd">달러 (USD)</Nav.Link>
            <Nav.Link as={NavLink} to="/jpy">엔화 (JPY)</Nav.Link>
          </Nav>
          <Button variant={theme === 'dark' ? 'outline-light' : 'outline-dark'} onClick={toggleTheme}>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavBar;
