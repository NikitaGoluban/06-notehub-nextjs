import css from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={css.footer}>
      <div className={css.content}>
        <p>© {new Date().getFullYear()} NoteHub. All rights reserved.</p>
        <div className={css.wrap}>
          <p>Developer: Nikita Goluban</p>
          <p>
            Contact us:{' '}
            <a href="mailto:nikitagoluban@proton.me">nikitagoluban@proton.me</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
