export default function Reviews() {
  return (
    <section className="reviews">
      <p className="eyebrow center">Real Customer Reviews</p>
      <h2>What Customers Say</h2>

      <div className="reviewGrid">
        <div className="review">
          <div className="stars">★★★★★</div>
          <p>
            “Mr. Roger was able to unlock my tire locks without hesitation and
            put on two new tires for me. Highly recommend. Great communication,
            very understanding, and fair pricing.”
          </p>
          <strong>— Kayla Irving</strong>
        </div>

        <div className="review">
          <div className="stars">★★★★★</div>
          <p>
            “Roger's Tire -N- Auto is the only place I truly trust to bring my
            vehicles. They don’t sell you more than you need and truly do right
            by the customer.”
          </p>
          <strong>— Robert</strong>
        </div>

        <div className="review">
          <div className="stars">★★★★★</div>
          <p>
            “I had a tire with a screw in it and Steven patched it for me. I
            was in a hurry. Great job. Support
            this family business!”
          </p>
          <strong>— Sue Crance</strong>
        </div>
      </div>
    </section>
  )
}