import { Services } from "./Services.jsx";

export function About() {
  return (
    <section id="about" className="section about-section" aria-labelledby="about-heading">
      <div className="container">
        <div className="row g-5 align-items-start">
          <div className="col-lg-5 fade-up">
            <p className="eyebrow">Nielsen Innovations</p>
            <h2 id="about-heading" className="section-heading">About me</h2>
          </div>
          <div className="col-lg-7 fade-up">
            <div className="about-copy">
              <p className="about-lead">
                Hi, I’m Lachlan — a full-stack developer and the person behind
                Nielsen Innovations.
              </p>
              <p>
                I turn early ideas into practical digital products, combining
                technical problem-solving with a strong focus on the people who
                use them.
              </p>
              <p>
                From the first design to development, hosting and ongoing
                support, I help organisations, teams and founders bring their
                ideas to life.
              </p>
            </div>
          </div>
        </div>
        <Services />
      </div>
    </section>
  );
}
