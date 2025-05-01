import Navbar from '../components/navbar';
import Hero from '../components/hero';
import Features from '../components/features';
import DeployForm from '../components/deployForm';
import Footer from '../components/footer';
import ThemeToggle from '../components/themeToggle';
import '../styles/styles.css';

export default function Home() {
  const scrollToForm = () => {
    document.getElementById('get-started').scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <>
      <Hero onGetStarted={scrollToForm} />
      <Features />
      <section id="get-started">
        <DeployForm />
      </section>
      <Footer />
      <ThemeToggle />
    </>
  );
}
